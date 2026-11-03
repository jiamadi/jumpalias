const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../extension/sync-rules.js');
const syncStore = require('../extension/sync-store.js');
const scopedStore = require('../extension/scoped-store.js');
function storage(initial = {}) {
  const data = structuredClone(initial);
  return { data, async get(keys) { return keys === null ? structuredClone(data) : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(k => k in data).map(k => [k, structuredClone(data[k])])); },
    async set(values) { Object.assign(data, structuredClone(values)); }, async remove(keys) { for (const key of [].concat(keys)) delete data[key]; } };
}
function fixture() {
  const sync = storage({ [R.SCHEMA_KEY]: 1 }); let id = 0;
  const device = (local = storage()) => ({ local, store: scopedStore({ local, synced: syncStore({ local, sync, uuid: () => `id-${++id}` }) }) });
  return { sync, device };
}
test('local URLs never enter cloud; synced URLs reach another device; restart preserves location', async () => {
  const f = fixture(), a = f.device(), b = f.device();
  await a.store.put('work', 'https://private', 'local');
  await a.store.put('public', 'https://public');
  assert.equal((await b.store.list()).work, undefined);
  assert.equal((await b.store.list()).public, 'https://public');
  assert(!JSON.stringify(f.sync.data).includes('https://private'));
  assert.deepEqual((await f.device(a.local).store.snapshot()).localPaths, ['work']);
});
test('sync to local removes remote copy but preserves local URL and children', async () => {
  const f = fixture(), a = f.device(), b = f.device();
  await a.store.put('work', 'https://work'); await a.store.put('work docs', 'https://docs');
  await b.store.list();
  await a.store.setScope('work', 'local');
  assert.equal((await a.store.list()).work, 'https://work');
  assert.equal((await b.store.list()).work, undefined);
  assert.equal((await b.store.list())['work docs'], 'https://docs');
  await a.store.setScope('work', 'sync');
  assert.equal((await b.store.list()).work, 'https://work');
  assert.deepEqual((await a.store.snapshot()).localPaths, []);
});
test('same-name conflict is explicit and cancellation is non-destructive; remote may be chosen', async () => {
  const f = fixture(), a = f.device(), b = f.device();
  await a.store.put('git', 'https://local', 'local'); await b.store.put('git', 'https://remote');
  assert.equal((await a.store.list()).git, 'https://local');
  assert.deepEqual((await a.store.snapshot()).overrides, ['git']);
  assert.deepEqual(await a.store.setScope('git', 'sync'), { conflict: { localUrl: 'https://local', syncedUrl: 'https://remote' } });
  assert.equal((await b.store.list()).git, 'https://remote');
  await a.store.setScope('git', 'sync', 'sync');
  assert.equal((await a.store.list()).git, 'https://remote');
});
test('local version can resolve conflict; deleting local override reveals cloud without deleting it', async () => {
  const f = fixture(), a = f.device(), b = f.device();
  await a.store.put('git', 'https://local', 'local'); await b.store.put('git', 'https://remote');
  await a.store.remove('git');
  assert.equal((await a.store.list()).git, 'https://remote');
  await a.store.put('git', 'https://local', 'local');
  await a.store.setScope('git', 'sync', 'local');
  assert.equal((await b.store.list()).git, 'https://local');
});
test('failed upload preserves local source and failed deletion preserves a local copy', async () => {
  const f = fixture(), a = f.device();
  await a.store.put('local', 'https://local', 'local');
  const set = f.sync.set;
  f.sync.set = async () => { throw new Error('quota'); };
  await assert.rejects(a.store.setScope('local', 'sync'), /quota/);
  assert.equal(a.local.data.jumpaliasLocalPaths.local, 'https://local');
  f.sync.set = set;
  await a.store.put('remote', 'https://remote');
  f.sync.set = async () => { throw new Error('quota'); };
  await assert.rejects(a.store.setScope('remote', 'local'), /quota/);
  assert.equal(a.local.data.jumpaliasLocalPaths.remote, 'https://remote');
  f.sync.set = set;
  await a.store.list();
  assert.deepEqual(a.local.data.jumpaliasLocalTransfers, []);
  assert.equal((await f.device().store.list()).remote, undefined);
});
test('imports respect selected location and do not upload existing local overrides', async () => {
  const f = fixture(), a = f.device(), b = f.device();
  await a.store.import({ private: 'https://private' }, 'local');
  await a.store.import({ private: 'https://updated', shared: 'https://shared' });
  assert.equal((await a.store.list()).private, 'https://updated');
  assert.deepEqual(await b.store.list(), { shared: 'https://shared' });
});
