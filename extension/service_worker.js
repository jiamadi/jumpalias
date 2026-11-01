importScripts('sync-rules.js', 'sync-store.js');

const shortcutStore = createJumpAliasSyncStore({ local: chrome.storage.local, sync: chrome.storage.sync });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'jumpkey:shortcuts') return;
  const actions = {
    list: () => shortcutStore.list(),
    put: () => shortcutStore.put(message.path, message.url),
    remove: () => shortcutStore.remove(message.path),
    import: () => shortcutStore.import(message.pairs)
  };
  const action = actions[message.action];
  if (!action) { respond({ ok: false, error: 'Unknown shortcut operation' }); return; }
  action().then((pairs) => respond({ ok: true, pairs }),
    (error) => respond({ ok: false, error: error.message }));
  return true;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && Object.keys(changes).some((key) => key.startsWith('jk:'))) {
    shortcutStore.list().catch(console.error);
  }
});
chrome.runtime.onStartup.addListener(() => shortcutStore.list().catch(console.error));
chrome.runtime.onInstalled.addListener(() => shortcutStore.list().catch(console.error));

chrome.omnibox.setDefaultSuggestion({
  description: 'Type a shortcut path, for example <match>dev github</match>'
});

function normalizeShortcut(shortcut) {
  return shortcut.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function escapeSuggestionText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function navigateToUrl(url) {
  const formattedUrl = /^[a-zA-Z]+:\/\//.test(url) ? url : `https://${url}`;
  if (formattedUrl.startsWith('chrome-extension://') || formattedUrl.startsWith('chrome://')) {
    chrome.tabs.create({ url: formattedUrl });
  } else {
    chrome.tabs.update({ url: formattedUrl });
  }
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const keyValuePairs = await shortcutStore.list();
  const query = normalizeShortcut(text);
  suggest(Object.entries(keyValuePairs)
    .filter(([path]) => path.startsWith(query) || path.includes(query))
    .slice(0, 6)
    .map(([path, url]) => ({
      content: path,
      description: `<match>${path}</match> <dim>→ ${escapeSuggestionText(url)}</dim>`
    })));
});

chrome.omnibox.onInputEntered.addListener(async (input) => {
  const keyValuePairs = await shortcutStore.list();
  const normalizedInput = normalizeShortcut(input);
  const slashIndex = normalizedInput.indexOf('/');
  if (slashIndex === -1) {
    if (normalizedInput in keyValuePairs) navigateToUrl(keyValuePairs[normalizedInput]);
    else chrome.tabs.update({ url: `https://www.google.com/search?q=${encodeURIComponent(input)}` });
    return;
  }
  const path = normalizedInput.substring(0, slashIndex);
  const resource = input.substring(slashIndex);
  if (path in keyValuePairs) navigateToUrl(keyValuePairs[path] + resource);
  else chrome.tabs.update({ url: `https://www.google.com/search?q=${encodeURIComponent(path)}` });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-current-page') return;
  await chrome.action.openPopup();
});
