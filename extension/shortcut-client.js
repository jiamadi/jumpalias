// UI-facing API: all persistence and synchronization belongs to the background.
const ShortcutRepository = {
  async request(action, data = {}) {
    let result;
    try {
      result = await chrome.runtime.sendMessage({ type: 'jumpkey:shortcuts', action, ...data });
    } catch (error) {
      throw new Error(`Cannot connect to the updated background. Reload the extension and retry. (${error.message})`);
    }
    if (!result) throw new Error('The updated background is not running. Reload the extension and retry.');
    if (!result.ok) throw new Error(result.error || 'Shortcut storage is unavailable.');
    return result.pairs;
  },
  list() { return this.request('list'); },
  put(path, url) { return this.request('put', { path, url }); },
  remove(path) { return this.request('remove', { path }); },
  import(pairs) { return this.request('import', { pairs }); }
};
