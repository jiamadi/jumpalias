const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canonicalUrl, aliasesForUrl } = require('../extension/url-rules.js');
const vm = require('node:vm');
const fs = require('node:fs');

test('equivalent host spellings, root slash and default ports detect all aliases', () => {
  assert.deepEqual(aliasesForUrl({ github: 'https://github.com/', code: 'https://GITHUB.com:443' }, 'github.com'), ['github', 'code']);
  assert.equal(canonicalUrl(' HTTP://EXAMPLE.COM:80 '), 'http://example.com/');
});

test('different protocols, paths, query parameters and fragments stay distinct', () => {
  for (const other of ['http://example.com/docs', 'https://example.com/docs/',
    'https://example.com/docs?x=1', 'https://example.com/docs#intro']) {
    assert.deepEqual(aliasesForUrl({ docs: 'https://example.com/docs' }, other), []);
  }
});

test('confirmation cancels without writing or clearing input; approval saves alias', async () => {
  let accept = false; let writes = 0; let prompted = '';
  const inputs = { keyInput: { value: 'dev github', focus() {} }, valueInput: { value: 'https://GITHUB.com' } };
  const context = {
    document: { addEventListener() {}, getElementById: (id) => inputs[id] },
    ShortcutRepository: { list: async () => ({ github: 'https://github.com/' }),
      put: async (path, url) => { writes++; return { [path]: url }; } },
    JumpAliasUrlRules: { aliasesForUrl }, confirm: (message) => { prompted = message; return accept; },
    alert: (message) => { throw new Error(message); }, console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('extension/popup.js', 'utf8'), context);
  vm.runInContext('renderTree = () => {};', context);
  await context.addKeyValuePair();
  assert.equal(writes, 0); assert.equal(inputs.keyInput.value, 'dev github'); assert.match(prompted, /github/);
  accept = true;
  await context.addKeyValuePair();
  assert.equal(writes, 1); assert.equal(inputs.keyInput.value, '');
});
