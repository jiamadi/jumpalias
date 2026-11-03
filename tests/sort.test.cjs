const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(order) {
  const context = vm.createContext({ document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync('extension/popup.js', 'utf8'), context);
  vm.runInContext(`sortOrder = '${order}';`, context);
  return context;
}
test('default dictionary order, newest and oldest order, unknown time last and stable ties', () => {
  const items = [{ path: 'b', timestamp: 10 }, { path: 'a', timestamp: 20 }, { path: 'c', timestamp: 20 }, { path: 'd', timestamp: 0 }];
  for (const [mode, expected] of [['alphabetical', 'abcd'], ['newest', 'acbd'], ['oldest', 'bacd']]) {
    assert.equal([...items].sort(setup(mode).compareTreeNodes).map(x => x.path).join(''), expected);
  }
});
test('groups use their most recently saved descendant and retain their hierarchy', () => {
  const context = setup('newest');
  vm.runInContext("keyValuePairs = { 'work old': 'old', 'work new': 'new', personal: 'personal' }; pathTimestamps = { 'work old': 10, 'work new': 30, personal: 20 };", context);
  const root = context.buildTree();
  assert.equal(root.children.get('work').timestamp, 30);
  assert.equal(root.children.get('work').children.size, 2);
  assert.equal([...root.children.values()].sort(context.compareTreeNodes)[0].path, 'work');
});
