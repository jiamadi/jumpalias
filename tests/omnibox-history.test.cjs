const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function setup(search) {
  const events = {}, opened = [], calls = [], hints = [];
  const event = name => ({ addListener: fn => events[name] = fn });
  const pairs = { git: 'http://gitlab.qiyi.domain/tv', 'git-slash': 'http://gitlab.qiyi.domain/tv/', 'git saved': 'http://gitlab.qiyi.domain/tv/saved', 'git team': 'http://gitlab.qiyi.domain/team' };
  const context = { URL, console, importScripts() {}, createJumpAliasSyncStore: () => ({ list: async () => pairs }), chrome: {
    storage: { local: {}, sync: {}, onChanged: event('storage') },
    runtime: { onMessage: event('message'), onStartup: event('startup'), onInstalled: event('installed') },
    omnibox: { setDefaultSuggestion: x => hints.push(x.description), onInputStarted: event('start'), onInputCancelled: event('cancel'), onInputChanged: event('change'), onInputEntered: event('enter') },
    history: { search: async query => { calls.push(query); return search(query); } },
    tabs: { create: x => opened.push(x.url), update: x => opened.push(x.url) }, commands: { onCommand: event('command') }
  } };
  vm.createContext(context);
  vm.runInContext(readFileSync('extension/service_worker.js', 'utf8'), context);
  return { events, opened, calls, hints };
}
(async () => {
  const base = 'http://gitlab.qiyi.domain/tv';
  const app = setup(() => [
    { url: base.replace('http:', 'https:') + '/tv60https', lastVisitTime: 1 },
    { url: base + '/tv60http', title: 'TV & HTTP', lastVisitTime: 5 },
    { url: base + '/requirements', lastVisitTime: 4 },
    { url: base + '/saved', lastVisitTime: 3 },
    { url: base + '/tv60http', lastVisitTime: 2 },
    { url: base + '-other/tv60http', lastVisitTime: 6 },
    { url: 'http://elsewhere.test/tv/tv60http', lastVisitTime: 7 },
    { url: 'http://gitlab.qiyi.domain/team/tv60http', lastVisitTime: 8 }
  ]);
  let results;
  let callbacks = 0;
  await app.events.change('git', x => { results = x; callbacks++; });
  assert.equal(callbacks, 1);
  assert.equal(results[0].content, 'git');
  assert(results.slice(0, 3).every(x => !x.description.includes('历史')));
  assert.equal(results.filter(x => x.content === base + '/saved').length, 0);
  assert(results.some(x => x.content === base + '/requirements'));
  assert(results.some(x => x.content === base.replace('http:', 'https:') + '/tv60https'));
  assert.equal(app.calls[0].text, 'gitlab.qiyi.domain');
  assert.equal(results.filter(x => x.content === base + '/tv60http').length, 1);
  assert(!results.some(x => x.content.includes('elsewhere') || x.content.includes('tv-other')));
  await app.events.change('git th', x => results = x);
  assert.equal(results.length, 2);
  assert.equal(results[0].content, base + '/tv60http');
  assert(results[0].description.includes('&amp;'));
  await app.events.enter(results[0].content);
  assert.equal(app.opened.at(-1), base + '/tv60http');
  await app.events.change('git/tv', x => results = x);
  assert.equal(results[0].content, base + '/tv60http');
  await app.events.change('git team th', x => results = x);
  assert.equal(results[0].content, 'http://gitlab.qiyi.domain/team/tv60http');
  await app.events.enter('git/direct');
  assert.equal(app.opened.at(-1), base + '/direct');
  await app.events.enter('git-slash/trailing');
  assert.equal(app.opened.at(-1), base + '/trailing');
  await app.events.enter('unknown/deep/path');
  assert.equal(app.opened.at(-1), 'https://www.google.com/search?q=unknown%2Fdeep%2Fpath');
  assert(app.calls.every(x => x.startTime === 0));
  const count = app.calls.length;
  await app.events.change('unknown', () => {});
  assert.equal(app.calls.length, count);
  let release;
  const slow = setup(() => new Promise(resolve => release = resolve));
  let publications = 0;
  const pending = slow.events.change('git', () => publications++);
  await new Promise(resolve => setImmediate(resolve));
  await slow.events.change('unknown', () => {});
  // A cancelled session must not publish the pending history results.
  slow.events.cancel();
  release([{ url: base + '/old' }]);
  await pending;
  assert.equal(publications, 0);
  const failed = setup(() => { throw new Error('Permission unavailable'); });
  await failed.events.change('git', x => results = x);
  assert.equal(results[0].content, 'git');
  console.log('Passed: alias priority, scoped history, fuzzy suffix, slash input, nested alias, deduplication, direct navigation, old history, unknown alias, cancelled query, history failure fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
