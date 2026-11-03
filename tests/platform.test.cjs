const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('extension/popup.js', 'utf8');
for (const [os, shortcut] of [['mac', 'Command+Shift+J'], ['win', 'Ctrl+Shift+J'], ['linux', 'Ctrl+Shift+J']]) {
  test(`platform ${os} uses the correct popup style flag and shortcut`, async () => {
    const document = { addEventListener() {}, documentElement: { dataset: {} }, body: { dataset: {} } };
    const context = vm.createContext({ document, navigator: { platform: 'wrong' }, chrome: { runtime: { getPlatformInfo: async () => ({ os }) } } });
    vm.runInContext(source, context);
    await context.initializePlatform();
    assert.equal(document.body.dataset.platform, os);
    assert.equal(document.documentElement.dataset.platform, os);
    assert.equal(context.defaultShortcut(), shortcut);
  });
}
test('platform detection falls back to navigator when runtime API fails', async () => {
  const document = { addEventListener() {}, documentElement: { dataset: {} }, body: { dataset: {} } };
  const context = vm.createContext({ document, navigator: { userAgentData: { platform: 'macOS' } }, chrome: { runtime: { getPlatformInfo: async () => { throw Error('unavailable'); } } } });
  vm.runInContext(source, context);
  await context.initializePlatform();
  assert.equal(document.body.dataset.platform, 'mac');
});
