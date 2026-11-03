const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(conflict = false) {
  const calls = [], context = vm.createContext({
    document: { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
    ShortcutRepository: { setScope: async (...args) => { calls.push(args); return conflict ? { conflict: { localUrl: 'local', syncedUrl: 'remote' } } : {}; } },
    confirm() { throw Error('Unexpected confirmation dialog'); }, prompt() { throw Error('Unexpected prompt'); }, alert() { throw Error('Unexpected alert'); }
  });
  vm.runInContext(fs.readFileSync('extension/popup.js', 'utf8'), context);
  vm.runInContext('refreshScopes = async () => {}; renderTree = () => {}; showScopeConflict = () => { globalThis.inlineConflict = true; };', context);
  return { context, calls };
}
test('switching from sync to local requires no dialog and re-enables the control', async () => {
  const { context, calls } = setup(); const button = {};
  await context.changePathScope('git', button);
  assert.deepEqual(Array.from(calls[0]), ['git', 'local']);
  assert.equal(button.disabled, false);
});
test('a conflict opens inline choices without a prompt or an automatic overwrite', async () => {
  const { context, calls } = setup(true); const button = {};
  vm.runInContext("localPaths.add('git');", context);
  await context.changePathScope('git', button);
  assert.equal(context.inlineConflict, true);
  assert.equal(calls.length, 1);
  assert.equal(button.disabled, false);
});
test('cloud controls bind hover and keyboard focus descriptions instead of native title', () => {
  const { context } = setup(); const attrs = {};
  const button = { dataset: {}, setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; } };
  context.paintSyncButton(button, true);
  assert.match(attrs['aria-label'], /跨设备同步/);
  assert.equal(typeof button.onmouseenter, 'function');
  assert.equal(typeof button.onfocus, 'function');
  assert.equal(typeof button.onmouseleave, 'function');
});
