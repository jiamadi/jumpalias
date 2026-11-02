importScripts('sync-rules.js', 'sync-store.js');

const shortcutStore = createJumpAliasSyncStore({ local: chrome.storage.local, sync: chrome.storage.sync });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'jumpkey:shortcuts') return;
  const actions = {
    historyCheck: () => checkHistoryMatching(message.input),
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

const idleSuggestion = '输入快捷路径，按 Enter 打开 <dim>· 例如 dev github</dim>';
chrome.omnibox.setDefaultSuggestion({ description: idleSuggestion });
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: idleSuggestion });
});

function normalizeShortcut(shortcut) {
  return shortcut.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function escapeSuggestionText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function resolveInput(input, pairs) {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return { matched: true, url: trimmed };
  const slashIndex = trimmed.indexOf('/');
  const path = normalizeShortcut(slashIndex === -1 ? trimmed : trimmed.slice(0, slashIndex));
  if (Object.prototype.hasOwnProperty.call(pairs, path)) {
    const target = pairs[path] + (slashIndex === -1 ? '' : trimmed.slice(slashIndex));
    return { matched: true, url: /^[a-zA-Z]+:\/\//.test(target) ? target : `https://${target}` };
  }
  const search = slashIndex === -1 ? input : path;
  return { matched: false, search, url: `https://www.google.com/search?q=${encodeURIComponent(search)}` };
}

// Use the longest saved alias as the scope, preserving nested aliases.
function historyScope(input, pairs) {
  const query = normalizeShortcut(input);
  const path = Object.keys(pairs).sort((a, b) => b.length - a.length).find((alias) =>
    query === alias || query.startsWith(alias + ' ') || query.startsWith(alias + '/'));
  if (!path) return null;
  try {
    const base = new URL(resolveInput(path, pairs).url);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    return { path, base, filter: query.slice(path.length).replace(/^[ /]+/, '') };
  } catch { return null; }
}

function fuzzyPathMatch(path, filter) {
  let position = 0;
  for (const character of filter.replace(/\s+/g, '').toLocaleLowerCase()) {
    position = path.indexOf(character, position);
    if (position === -1) return false;
    position++;
  }
  return true;
}

async function historySuggestions(input, pairs, aliases) {
  const scope = historyScope(input, pairs);
  if (!scope || !chrome.history) return [];
  const prefix = scope.base.pathname.replace(/\/$/, '');
  const seen = new Set(aliases.map(({ content }) => resolveInput(content, pairs).url));
  try {
    // Explicit startTime includes old visits, rather than Chrome's default last day.
    const visits = await chrome.history.search({ text: scope.base.hostname, startTime: 0, maxResults: 10000 });
    return visits.filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      let url;
      try { url = new URL(item.url); } catch { return false; }
      if (!['http:', 'https:'].includes(url.protocol) || url.host !== scope.base.host ||
          !(url.pathname === prefix || url.pathname.startsWith(prefix + '/'))) return false;
      let suffix = url.pathname.slice(prefix.length) + url.search + url.hash;
      try { suffix = decodeURIComponent(suffix); } catch { /* Match the encoded path if malformed. */ }
      if (!fuzzyPathMatch(suffix.toLocaleLowerCase(), scope.filter)) return false;
      seen.add(item.url);
      return true;
    }).sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))
      .slice(0, 6)
      .map((item) => ({
        content: item.url,
        description: `<dim>历史</dim> <url>${escapeSuggestionText(item.url)}</url>${item.title ? ` <dim>· ${escapeSuggestionText(item.title)}</dim>` : ''}`
      }));
  } catch (error) {
    console.warn('Could not read history suggestions:', error);
    return [];
  }
}

async function checkHistoryMatching(input) {
  const pairs = await shortcutStore.list();
  const scope = historyScope(input, pairs);
  const permission = await chrome.permissions.contains({ permissions: ['history'] });
  const report = {
    input, historyPermission: permission,
    alias: scope?.path || null, baseUrl: scope?.base.href || null,
    filter: scope?.filter || '', historyApiAvailable: Boolean(chrome.history)
  };
  if (!scope || !permission || !chrome.history) return report;
  try {
    const visits = await chrome.history.search({ text: scope.base.hostname, startTime: 0, maxResults: 10000 });
    report.domainResults = visits.length;
    report.candidates = await historySuggestions(input, pairs, []);
    report.domainExamples = visits.slice(0, 3).map(item => item.url);
  } catch (error) { report.error = error.message; }
  return report;
}

let inputRevision = 0;
chrome.omnibox.onInputCancelled.addListener(() => { inputRevision++; });

function navigateToUrl(url) {
  const formattedUrl = /^[a-zA-Z]+:\/\//.test(url) ? url : `https://${url}`;
  if (formattedUrl.startsWith('chrome-extension://') || formattedUrl.startsWith('chrome://')) {
    chrome.tabs.create({ url: formattedUrl });
  } else {
    chrome.tabs.update({ url: formattedUrl });
  }
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const revision = ++inputRevision;
  const keyValuePairs = await shortcutStore.list();
  if (revision !== inputRevision) return;
  const query = normalizeShortcut(text);
  const target = resolveInput(text, keyValuePairs);
  chrome.omnibox.setDefaultSuggestion({
    description: !query ? idleSuggestion : target.matched
      ? `按 Enter 打开 → <url>${escapeSuggestionText(target.url)}</url>`
      : `未找到快捷路径，按 Enter 使用 Google 搜索 <match>${escapeSuggestionText(target.search)}</match>`
  });
  const aliases = Object.entries(keyValuePairs)
    .filter(([path]) => path.startsWith(query) || path.includes(query))
    .slice(0, 6)
    .map(([path, url]) => ({
      content: path,
      description: `<match>${escapeSuggestionText(path)}</match> <dim>→ ${escapeSuggestionText(url)}</dim>`
    }));
  const history = await historySuggestions(text, keyValuePairs, aliases);
  if (revision !== inputRevision) return;
  if (!target.matched && history.length) {
    chrome.omnibox.setDefaultSuggestion({
      description: '选择下方历史记录打开 <dim>· 直接按 Enter 使用 Google 搜索</dim>'
    });
  }
  suggest([...aliases, ...history].slice(0, 12));
});

chrome.omnibox.onInputEntered.addListener(async (input) => {
  inputRevision++;
  const keyValuePairs = await shortcutStore.list();
  const target = resolveInput(input, keyValuePairs);
  navigateToUrl(target.url);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'add-current-page') return;
  await chrome.action.openPopup();
});
