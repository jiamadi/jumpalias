const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../extension/sync-rules.js');
const createStore = require('../extension/sync-store.js');

function storage(initial = {}) {
  const data = structuredClone(initial);
  const writes = [];
  return {
    data, writes,
    async get(keys) {
      if (keys === null) return structuredClone(data);
      return Object.fromEntries((Array.isArray(keys) ? keys : [keys])
        .filter((key) => key in data).map((key) => [key, structuredClone(data[key])]));
    },
    async set(values) { writes.push(structuredClone(values)); Object.assign(data, structuredClone(values)); },
    async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }
  };
}

function fixture(cloudData = { [R.SCHEMA_KEY]: 1 }) {
  const sync = storage(cloudData);
  let time = 1_800_000_000_000;
  let nextId = 0;
  function device(initial) {
    const local = storage(initial);
    const store = createStore({ local, sync, now: () => time, uuid: () => `id-${++nextId}` });
    return { local, store };
  }
  return { sync, device, advance(days) { time += days * R.DAY; }, now: () => time };
}

test('migration splits the legacy map and keeps a local recovery backup', async () => {
  const f = fixture({ keyValuePairs: { 'tv git': 'https://git', 'tv doc': 'https://doc' } });
  const a = f.device();
  assert.deepEqual(await a.store.list(), { 'tv git': 'https://git', 'tv doc': 'https://doc' });
  assert.deepEqual(a.local.data.jumpkeyLegacyBackup, { 'tv git': 'https://git', 'tv doc': 'https://doc' });
  assert.ok(f.sync.data[R.keyFor('tv git')]);
  await a.store.list();
  assert.equal(f.sync.data.keyValuePairs, undefined);
  const b = f.device({ keyValuePairs: { resurrect: 'https://old' } });
  assert.equal((await b.store.list()).resurrect, undefined);
});

test('different paths never overwrite one another; writes do not rewrite the whole map', async () => {
  const f = fixture(); const a = f.device(); const b = f.device();
  await a.store.list(); await b.store.list();
  await a.store.put('tv git', 'https://git');
  const start = f.sync.writes.length;
  await b.store.put('tv doc', 'https://doc');
  assert.deepEqual(await a.store.list(), { 'tv git': 'https://git', 'tv doc': 'https://doc' });
  assert.ok(!f.sync.writes.slice(start).some((write) => R.keyFor('tv git') in write));
});

test('late older remote revision is repaired using the newest local record', async () => {
  const f = fixture(); const a = f.device();
  await a.store.put('git', 'https://old');
  const older = structuredClone(f.sync.data[R.keyFor('git')]);
  await a.store.put('git', 'https://new');
  await f.sync.set({ [R.keyFor('git')]: older });
  assert.equal((await a.store.list()).git, 'https://new');
  assert.equal(f.sync.data[R.keyFor('git')].url, 'https://new');
});

test('timestamp ties use device ID and comparison is symmetric', () => {
  const a = { updatedAt: 100, deviceId: 'a', deleted: false, url: 'a' };
  const b = { ...a, deviceId: 'b' };
  assert.equal(R.compare(a, b), -1);
  assert.equal(R.compare(b, a), 1);
  assert.equal(R.compare(a, structuredClone(a)), 0);
});

test('delete waits for active devices to acknowledge the exact deletion version', async () => {
  const f = fixture(); const a = f.device(); const b = f.device();
  await a.store.put('git', 'https://git'); await b.store.list();
  await a.store.remove('git');
  const key = R.keyFor('git');
  assert.equal(f.sync.data[key].deleted, true);
  assert.equal((await b.store.list()).git, undefined);
  assert.equal(f.sync.data[key], undefined);
  assert.equal((await a.store.list()).git, undefined);
  assert.ok(a.local.data.jumpkeySyncState.graveyard[key]);
  assert.equal(R.canCollect({ deleted: true, deleteId: 'new' }, {
    a: { lastSeen: f.now(), seenDeletes: ['old'] }
  }, f.now()), false);
});

test('a delayed live record cannot resurrect a collected deletion', async () => {
  const f = fixture(); const a = f.device(); const b = f.device();
  await a.store.put('git', 'https://git'); await b.store.list();
  const key = R.keyFor('git'); const stale = structuredClone(f.sync.data[key]);
  await a.store.remove('git'); await b.store.list();
  assert.equal(f.sync.data[key], undefined);
  await f.sync.set({ [key]: stale });
  assert.equal((await a.store.list()).git, undefined);
  assert.ok(!f.sync.data[key] || f.sync.data[key].deleted);
});

test('devices inactive beyond 30 days stop blocking collection and reset before upload', async () => {
  const f = fixture(); const a = f.device(); const b = f.device();
  await a.store.put('git', 'https://git'); await b.store.list();
  // Keep A active so only B expires.
  f.advance(20); await a.store.list();
  f.advance(11); await a.store.remove('git');
  assert.equal(f.sync.data[R.keyFor('git')], undefined);
  assert.deepEqual(await b.store.list(), {});
  assert.ok(b.local.data.jumpkeyExpiredDeviceBackup.records[R.keyFor('git')]);
  assert.equal(f.sync.data[R.keyFor('git')], undefined);
});

test('heartbeat is written at most once a day when acknowledgements do not change', async () => {
  const f = fixture(); const a = f.device();
  await a.store.list();
  const count = () => f.sync.writes.filter((write) => Object.keys(write).some((key) => key.startsWith(R.DEVICE_PREFIX))).length;
  assert.equal(count(), 1);
  await a.store.list(); await a.store.list(); assert.equal(count(), 1);
  f.advance(1); await a.store.list(); assert.equal(count(), 2);
});

test('a single item over 8 KB is backed up without blocking subsequent operations', async () => {
  const f = fixture(); const a = f.device();
  await assert.rejects(a.store.put('long', 'https://example.com/' + 'a'.repeat(9000)), /8 KB/);
  assert.ok(a.local.data.jumpkeyRejectedEditBackup.records[R.keyFor('long')]);
  assert.equal(f.sync.data[R.keyFor('long')], undefined);
  await a.store.put('short', 'https://example.com');
  assert.equal((await a.store.list()).short, 'https://example.com');
});

test('several records may exceed 8 KB in aggregate without exceeding the per-item limit', async () => {
  const f = fixture(); const a = f.device();
  await a.store.import(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`path ${i}`, 'https://example.com/' + 'x'.repeat(500)])));
  assert.equal(Object.keys(await a.store.list()).length, 20);
});

test('queue keeps processing after a quota error and retries unsent data', async () => {
  const f = fixture(); const a = f.device(); await a.store.list();
  const originalSet = f.sync.set;
  f.sync.set = async () => { throw new Error('QUOTA_BYTES'); };
  await assert.rejects(a.store.put('git', 'https://git'), /QUOTA_BYTES/);
  f.sync.set = originalSet;
  assert.equal((await a.store.list()).git, 'https://git');
});

test('migration can be retried after its first cloud write fails', async () => {
  const f = fixture({ keyValuePairs: { git: 'https://git' } }); const a = f.device();
  const originalSet = f.sync.set;
  f.sync.set = async () => { throw new Error('quota'); };
  await assert.rejects(a.store.list(), /quota/);
  assert.ok(f.sync.data.keyValuePairs);
  f.sync.set = originalSet;
  assert.equal((await a.store.list()).git, 'https://git');
  assert.equal(f.sync.data[R.SCHEMA_KEY], 1);
});

test('a deliberately recreated path can supersede its collected tombstone', async () => {
  const f = fixture(); const a = f.device();
  await a.store.put('git', 'https://old');
  await a.store.remove('git');
  assert.equal(f.sync.data[R.keyFor('git')], undefined);
  await a.store.put('git', 'https://new');
  assert.equal((await a.store.list()).git, 'https://new');
});

test('repeated reads in the same day do not write local state again', async () => {
  const f = fixture(); const a = f.device(); await a.store.list();
  const writes = a.local.writes.length;
  await a.store.list(); await a.store.list();
  assert.equal(a.local.writes.length, writes);
});

test('background messaging and client exercise the real add/list/delete pipeline', async () => {
  const fs = require('node:fs'); const vm = require('node:vm');
  const local = storage(); const sync = storage({ [R.SCHEMA_KEY]: 1 });
  const events = {};
  const event = (name) => ({ addListener(fn) { events[name] = fn; } });
  const chrome = {
    runtime: { id: 'extension', onMessage: event('message'), onStartup: event('startup'), onInstalled: event('install') },
    storage: { local, sync, onChanged: event('storage') },
    omnibox: { setDefaultSuggestion() {}, onInputStarted: event('inputStart'), onInputCancelled: event('inputCancel'), onInputChanged: event('suggest'), onInputEntered: event('enter') },
    commands: { onCommand: event('command') }, tabs: {}, action: {}
  };
  const context = vm.createContext({ chrome, console, TextEncoder, crypto: require('node:crypto').webcrypto });
  context.importScripts = (...files) => files.forEach((file) => vm.runInContext(fs.readFileSync(`extension/${file}`, 'utf8'), context));
  vm.runInContext(fs.readFileSync('extension/service_worker.js', 'utf8'), context);
  chrome.runtime.sendMessage = (message) => new Promise((resolve) => events.message(message, { id: 'extension' }, resolve));
  vm.runInContext(fs.readFileSync('extension/shortcut-client.js', 'utf8') + '\nglobalThis.client = ShortcutRepository;', context);
  await context.client.put('tv git', 'https://git');
  assert.equal((await context.client.list())['tv git'], 'https://git');
  await context.client.remove('tv git');
  assert.equal((await context.client.list())['tv git'], undefined);
  let suggestions;
  await context.client.put('tv doc', 'https://doc');
  await events.suggest('tv', (items) => { suggestions = items; });
  assert.equal(suggestions[0].content, 'tv doc');
});
