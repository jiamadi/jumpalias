let keyValuePairs = {};
let themeMode = 'system';
let tree;
let language = 'zh';
let commandShortcut = '';
let shortcutReadError = false;
let preferredShortcut = '';
let addingShortcut = false;

const translations = {
  zh: {
    duplicateUrl: '该地址已收录为：\n{paths}\n\n仍要使用新路径「{path}」添加另一个别名吗？',
    guideTitle: '设置与使用指南', guideSubtitle: '给常用页面一个好记的路径。',
    usageTitle: '快速开始', controlsTitle: '个性化设置', syncTitle: '同步与备份',
    captureInstructions: '<strong>收录页面</strong>：打开插件会自动填入当前 URL，输入 <code>dev github</code> 这样的路径，按 <code>Enter</code> 保存，也可以修改 URL 后再保存。',
    jumpInstructions: '<strong>跳转页面</strong>：按 <code>{addressBarShortcut}</code> 聚焦地址栏，输入 <code>{keyword}</code> 后按 <code>Tab</code> 或空格，再输入 <code>dev github</code>，按 <code>Enter</code> 跳转。',
    treeInstructions: '例如，保存 <code>dev github</code> → github.com、<code>dev docs</code> → developer.mozilla.org，两个路径都会归到 <code>dev</code> 下。父节点也能绑定自己的 URL；点击列表中的 URL 可直接打开。',
    shortcutHelp: '显示 Chrome 实际绑定。自定义组合需在 Chrome 设置页应用，插件内按键录入不会直接修改系统绑定。',
    keywordSummary: 'Tab 和空格是固定的进入方式。修改触发词属于高级设置，需要替换配置并重新加载扩展。',
    appearanceInstructions: '右上角可切换「中 / EN」；主题按「跟随系统 → 白天 → 夜晚」循环，悬停图标查看当前模式。',
    syncInstructions: '路径与语言通过 Chrome 免费同步。各设备需登录同一 Google 账号、开启 Chrome 同步，并安装相同扩展 ID 的插件。',
    syncConflictHelp: '每条路径独立同步；相同路径发生冲突时，优先保留时间戳较新的版本。',
    syncDeleteHelp: '删除会等待活跃设备确认后清理。超过 30 天未活跃的设备重连时，会备份本地旧数据并以云端记录重建。',
    backupInstructions: '「导入」直接粘贴 JSON；「导出」将 JSON 复制到剪贴板。迁移或重装前建议先导出备份。',
    syncLimits: '主题仅保存在当前设备。同步额度约 100 KB / 单项 8 KB / 512 项（含设备与删除记录）；暂不支持 iCloud。',
    omniboxHint: '地址栏 <code>{keyword}</code> + <code>Tab</code> 或空格跳转路径，例如 <code>dev github</code>',
    keywordLabel: '地址栏触发词', downloadManifest: '下载配置',
    keywordHelp: '将下载文件替换到当前扩展目录中的 manifest.json，再到扩展管理页刷新。请保留原目录和扩展，避免丢失数据。Tab 和空格无需设置。（提示：仅限源码/解压安装模式；应用商店版本不可修改）',
    invalidKeyword: '请输入 1–32 个字母或数字作为触发词。',
    captureHint: '保存当前页面',
    urlHint: '支持 https://、http://、chrome-extension://、chrome://',
    pathHeader: '路径', urlHeader: '完整 URL', pathPlaceholder: '路径，例如 dev github', urlPlaceholder: '输入 URL',
    listTitle: '已保存路径（{count}）', emptyTree: '还没有保存的路径。',
    import: '导入', export: '导出', exported: '快捷路径已复制到剪贴板。',
    importPrompt: '粘贴 JSON：', imported: '快捷路径导入成功。', importFailed: '导入失败：请提供由路径和 URL 组成的 JSON 对象。',
    reloadStorage: '重新加载扩展（保留数据）', importWriteFailed: 'JSON 格式正确，但保存失败：{error}',
    invalidPath: '请输入由文字、数字、空格、连字符或下划线组成的路径。', duplicatePath: '该路径已存在；请先删除它或使用新路径。',
    draftPath: '为“{title}”输入路径', deletePath: '删除 {path}',
    shortcutPlaceholder: '按下快捷键', openShortcutSettings: '设置',
    shortcutDefault: '默认 {shortcut}（未绑定）',
    shortcutReadFailed: '读取失败，请重新加载扩展',
    missingCommands: 'Chrome 尚未提供命令 API，请重新加载扩展后再打开弹窗。',
    themeSystem: '跟随系统', themeLight: '白天', themeDark: '夜晚',
    themeToggleHint: '主题：{current}；点击切换为{next}', languageToggleHint: '语言：中文；点击切换为 English',
    shortcutInvalid: '快捷键需要包含 ⌘、Ctrl 或 Alt，且不能使用 Ctrl+Alt。'
  },
  en: {
    duplicateUrl: 'This URL is already saved as:\n{paths}\n\nAdd another alias named “{path}” anyway?',
    guideTitle: 'Settings & guide', guideSubtitle: 'Give your pages memorable paths.',
    usageTitle: 'Quick start', controlsTitle: 'Personalize', syncTitle: 'Sync & backup',
    captureInstructions: '<strong>Save a page.</strong> Open the extension to fill in the current URL. Enter a path like <code>dev github</code> and press <code>Enter</code> to save. You can edit the URL first.',
    jumpInstructions: '<strong>Jump to a page.</strong> Press <code>{addressBarShortcut}</code>, enter <code>{keyword}</code>, press <code>Tab</code> or Space, type <code>dev github</code>, then press <code>Enter</code>.',
    treeInstructions: 'For example, save <code>dev github</code> → github.com and <code>dev docs</code> → developer.mozilla.org. Both appear under <code>dev</code>. A parent can have its own URL too. Click a listed URL to open it.',
    shortcutHelp: 'Shows Chrome’s actual binding. Apply custom combinations in Chrome settings; recording keys here does not change the active binding.',
    keywordSummary: 'Tab and Space are fixed activation keys. Changing the keyword is advanced: replace the configuration and reload the extension.',
    appearanceInstructions: 'Use the header to switch 中 / EN or cycle System → Light → Dark. Hover over the theme icon for its current mode.',
    syncInstructions: 'Paths and language sync free through Chrome. Use the same Google account, enable Chrome Sync, and install the same extension ID on each device.',
    syncConflictHelp: 'Paths sync independently. For conflicting edits to the same path, the newer timestamp wins.',
    syncDeleteHelp: 'Deletions are cleaned up after active devices acknowledge them. Devices inactive for over 30 days back up old local data and rebuild from cloud on return.',
    backupInstructions: 'Import by pasting JSON; Export copies JSON to the clipboard. Export a backup before moving or reinstalling.',
    syncLimits: 'Theme stays on this device. Sync allows about 100 KB total / 8 KB per item / 512 items, including device and deletion records. No iCloud sync yet.',
    omniboxHint: 'Address bar <code>{keyword}</code> + <code>Tab</code> or Space jumps to a path, e.g. <code>dev github</code>',
    keywordLabel: 'Address bar keyword', downloadManifest: 'Download config',
    keywordHelp: 'Replace manifest.json in the current extension folder with the downloaded file, then reload the extension. Keep the existing folder and installation to preserve data. Tab and Space stay unchanged. (Note: Only available for unpacked/source installations; Web Store versions cannot be modified)',
    invalidKeyword: 'Use 1–32 letters or digits for the keyword.',
    captureHint: 'Save current page',
    urlHint: 'Supports https://, http://, chrome-extension://, chrome://',
    pathHeader: 'Path', urlHeader: 'Complete URL', pathPlaceholder: 'Path, e.g. dev github', urlPlaceholder: 'Enter URL',
    listTitle: 'Saved paths ({count})', emptyTree: 'No saved paths yet.',
    import: 'Import', export: 'Export', exported: 'Shortcuts exported to Clipboard.',
    importPrompt: 'Paste the JSON string:', imported: 'Shortcuts imported successfully.', importFailed: 'Import failed: provide a JSON object of paths and URLs.',
    reloadStorage: 'Reload extension (keep data)', importWriteFailed: 'JSON is valid, but saving failed: {error}',
    invalidPath: 'Enter a path using letters, numbers, spaces, hyphens, or underscores.', duplicatePath: 'That path already exists. Delete it first or choose a new path.',
    draftPath: 'Path for {title}', deletePath: 'Delete {path}',
    shortcutPlaceholder: 'Press a shortcut', openShortcutSettings: 'Settings',
    shortcutDefault: 'Default {shortcut} (unassigned)',
    shortcutReadFailed: 'Read failed; reload the extension',
    missingCommands: 'Chrome has not exposed the commands API. Reload the extension, then reopen the popup.',
    themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    themeToggleHint: 'Theme: {current}; click for {next}', languageToggleHint: 'Language: English; click for 中文',
    shortcutInvalid: 'A shortcut needs ⌘, Ctrl, or Alt, and cannot use Ctrl+Alt.'
  }
};

function t(key, values = {}) {
  return translations[language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

function applyTranslations() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.innerHTML = t(element.dataset.i18n, { keyword: chrome.runtime.getManifest().omnibox.keyword, addressBarShortcut: isMac() ? '⌘ + L' : 'Ctrl + L' });
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  updateShortcutCopy();
  updateListTitle();
  updateHeaderControls();
}

const themeModes = ['system', 'light', 'dark'];
const themeIcons = {
  system: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  dark: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>'
};

function updateHeaderControls() {
  const theme = document.getElementById('themeToggle');
  const nextMode = themeModes[(themeModes.indexOf(themeMode) + 1) % themeModes.length];
  const themeKey = (mode) => `theme${mode[0].toUpperCase()}${mode.slice(1)}`;
  theme.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${themeIcons[themeMode]}</svg>`;
  theme.title = t('themeToggleHint', { current: t(themeKey(themeMode)), next: t(themeKey(nextMode)) });
  theme.setAttribute('aria-label', theme.title);
  const languageButton = document.getElementById('languageToggle');
  languageButton.textContent = language === 'zh' ? '中' : 'EN';
  languageButton.title = t('languageToggleHint');
  languageButton.setAttribute('aria-label', languageButton.title);
  const settings = document.getElementById('settingsToggle');
  settings.title = t('openShortcutSettings');
  settings.setAttribute('aria-label', settings.title);
}

function isMac() {
  return /mac/i.test(navigator.userAgentData?.platform || navigator.platform || '');
}

function defaultShortcut() {
  return isMac() ? 'Command+Shift+K' : 'Ctrl+Shift+K';
}

function humanShortcut(shortcut) {
  return shortcut.replaceAll('Command', '⌘').replaceAll('MacCtrl', 'Ctrl').replaceAll('+', ' + ');
}

function updateShortcutCopy() {
  document.getElementById('shortcutInput').value = shortcutReadError ? t('shortcutReadFailed') : commandShortcut
    ? humanShortcut(commandShortcut)
    : t('shortcutDefault', { shortcut: humanShortcut(defaultShortcut()) });
}

function updateListTitle() {
  const title = document.getElementById('shortcutListTitle');
  if (title) title.textContent = t('listTitle', { count: Object.keys(keyValuePairs).length });
}

document.addEventListener('DOMContentLoaded', async () => {
  const keyInput = document.getElementById('keyInput');
  const valueInput = document.getElementById('valueInput');
  const languageToggle = document.getElementById('languageToggle');
  const themeToggle = document.getElementById('themeToggle');
  document.getElementById('settingsToggle').addEventListener('click', () => {
    const panel = document.getElementById('settingsPanel');
    panel.hidden = !panel.hidden;
    document.getElementById('settingsToggle').setAttribute('aria-expanded', String(!panel.hidden));
  });
  tree = document.getElementById('shortcutTree');
  document.getElementById('reloadStorageButton').addEventListener('click', () => chrome.runtime.reload());
  document.getElementById('keywordInput').value = chrome.runtime.getManifest().omnibox.keyword;
  document.getElementById('keywordSettingsButton').addEventListener('click', () => {
    const panel = document.getElementById('keywordSettings');
    panel.hidden = !panel.hidden;
    document.getElementById('keywordSettingsButton').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) document.getElementById('keywordInput').focus();
  });
  document.getElementById('saveKeywordButton').addEventListener('click', downloadKeywordManifest);
  document.getElementById('addButton').addEventListener('click', addKeyValuePair);
  document.getElementById('importButton').addEventListener('click', () => importShortcutsFromJSON());
  document.getElementById('exportButton').addEventListener('click', exportShortcutsToJSON);
  document.getElementById('githubButton').addEventListener('click', () => chrome.tabs.create({ url: 'https://github.com/jiamadi/jumpalias' }));
  [keyInput, valueInput].forEach((input) => input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      addKeyValuePair();
    }
  }));
  themeToggle.addEventListener('click', () => {
    themeMode = themeModes[(themeModes.indexOf(themeMode) + 1) % themeModes.length];
    setTheme();
    updateHeaderControls();
    chrome.storage.local.set({ themeMode });
  });
  document.getElementById('shortcutInput').addEventListener('keydown', captureShortcut);
  document.getElementById('shortcutSettingsButton').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  languageToggle.addEventListener('click', async () => {
    language = language === 'zh' ? 'en' : 'zh';
    await chrome.storage.sync.set({ language });
    applyTranslations();
  });
  await loadTheme();
  await loadLanguage();
  await loadCommandShortcut();
  await loadKeyValuePairs();
  await fillCurrentPage();
  window.addEventListener('focus', loadCommandShortcut);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && Object.keys(changes).some((key) => key.startsWith('jk:path:'))) {
      loadKeyValuePairs().catch(console.error);
    }
  });
});

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* Fallback to execCommand below */ }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function manifestWithKeyword(keyword) {
  if (!/^[\p{L}\p{N}]{1,32}$/u.test(keyword)) throw new Error(t('invalidKeyword'));
  const manifest = structuredClone(chrome.runtime.getManifest());
  manifest.omnibox.keyword = keyword;
  return manifest;
}

function downloadKeywordManifest() {
  try {
    const keyword = document.getElementById('keywordInput').value.trim();
    const manifest = manifestWithKeyword(keyword);
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manifest.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    alert(error.message);
  }
}

async function exportShortcutsToJSON() {
  await copyToClipboard(JSON.stringify(keyValuePairs));
  alert(t('exported'));
}

async function importShortcutsFromJSON(jsonString) {
  if (typeof jsonString !== 'string') jsonString = prompt(t('importPrompt'));
  if (!jsonString) return;
  let pairs;
  try {
    const parsed = JSON.parse(jsonString.replace(/^\uFEFF/, ''));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected an object');
    pairs = {};
    for (const [path, url] of Object.entries(parsed)) {
      const normalizedPath = normalizeShortcut(path);
      if (!isValidShortcut(normalizedPath) || typeof url !== 'string') throw new Error('Invalid path or URL');
      pairs[normalizedPath] = url;
    }
  } catch (error) {
    alert(t('importFailed'));
    return;
  }
  try {
    keyValuePairs = await ShortcutRepository.import(pairs);
    document.getElementById('storageNotice').hidden = true;
    renderTree();
    alert(t('imported'));
  } catch (error) {
    console.error(error);
    showStorageError(error);
    alert(t('importWriteFailed', { error: error.message }));
  }
}

function systemUsesLightTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

function setTheme() {
  const lightTheme = themeMode === 'light' || (themeMode === 'system' && systemUsesLightTheme());
  document.body.dataset.theme = lightTheme ? 'light' : 'dark';
}

async function loadTheme() {
  const saved = await chrome.storage.local.get(['themeMode', 'lightTheme']);
  themeMode = ['system', 'light', 'dark'].includes(saved.themeMode)
    ? saved.themeMode
    : (saved.lightTheme ? 'light' : 'system');
  setTheme();
  updateHeaderControls();
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (themeMode === 'system') setTheme();
  });
}

async function loadLanguage() {
  const stored = await chrome.storage.sync.get('language');
  language = stored.language === 'en' ? 'en' : 'zh';
  applyTranslations();
}

async function loadCommandShortcut() {
  commandShortcut = '';
  shortcutReadError = false;
  try {
    if (typeof chrome.commands?.getAll !== 'function') throw new Error(t('missingCommands'));
    const commands = await new Promise((resolve, reject) => {
      chrome.commands.getAll((result) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else if (!Array.isArray(result)) reject(new Error('Chrome returned no command list'));
        else resolve(result);
      });
    });
    const captureCommands = ['_execute_action', 'add-current-page'];
    const bindings = captureCommands.map((name) => commands.find((command) => command.name === name)?.shortcut)
      .filter(Boolean);
    commandShortcut = [...new Set(bindings)].join(' / ');
  } catch (error) {
    shortcutReadError = true;
    console.warn('Could not read Chrome command bindings:', error);
  }
  updateShortcutCopy();
}

async function captureShortcut(event) {
  event.preventDefault();
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return;
  const hasPrimaryModifier = isMac() ? (event.metaKey || event.ctrlKey || event.altKey) : (event.ctrlKey || event.altKey);
  if (!hasPrimaryModifier || (event.ctrlKey && event.altKey)) {
    alert(t('shortcutInvalid'));
    return;
  }
  const modifiers = [];
  if (event.metaKey) modifiers.push('Command');
  else if (event.ctrlKey) modifiers.push(isMac() ? 'MacCtrl' : 'Ctrl');
  if (event.altKey) modifiers.push(isMac() ? 'Option' : 'Alt');
  if (event.shiftKey) modifiers.push('Shift');
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  preferredShortcut = [...modifiers, key].join('+');
  await chrome.storage.sync.set({ preferredShortcut });
  // A captured preference cannot change Chrome's binding. Keep showing the
  // effective command until the user applies their choice in Chrome settings.
  await loadCommandShortcut();
}

async function getShortcutPairs() {
  return ShortcutRepository.list();
}

async function loadKeyValuePairs() {
  try {
    keyValuePairs = await getShortcutPairs();
    document.getElementById('storageNotice').hidden = true;
  } catch (error) {
    showStorageError(error);
    // Read-only compatibility with a not-yet-reloaded legacy background.
    // Never write the old blob or migrate from the UI.
    const synced = await chrome.storage.sync.get(['keyValuePairs', 'jk:schema']);
    if (!synced['jk:schema']) {
      const saved = await chrome.storage.local.get(['keyValuePairs', 'jumpkeyLegacyBackup']);
      keyValuePairs = synced.keyValuePairs || saved.jumpkeyLegacyBackup || saved.keyValuePairs || {};
    }
  }
  renderTree();
}

function showStorageError(error) {
  document.getElementById('storageNoticeText').textContent = error.message;
  document.getElementById('storageNotice').hidden = false;
}

async function fillCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    document.getElementById('valueInput').value = tab?.url || '';
  } catch (error) {
    console.warn('Could not read current page URL:', error);
  }
  document.getElementById('keyInput').focus();
}

async function addKeyValuePair() {
  if (addingShortcut) return;
  const keyInput = document.getElementById('keyInput');
  const valueInput = document.getElementById('valueInput');
  const path = normalizeShortcut(keyInput.value);
  let url = valueInput.value.trim();
  if (!path || !url || !isValidShortcut(path)) {
    alert(t('invalidPath'));
    return;
  }
  if (!url.includes('://')) url = `https://${url}`;
  addingShortcut = true;
  try {
    keyValuePairs = await ShortcutRepository.list();
    if (path in keyValuePairs) {
      alert(t('duplicatePath'));
      return;
    }
    const aliases = JumpAliasUrlRules.aliasesForUrl(keyValuePairs, url);
    if (aliases.length && !confirm(t('duplicateUrl', { paths: aliases.join('\n'), path }))) return;
    keyValuePairs = await ShortcutRepository.put(path, url);
  } catch (error) {
    alert(error.message);
    return;
  } finally {
    addingShortcut = false;
  }
  renderTree();
  keyInput.value = '';
  valueInput.value = '';
  keyInput.focus();
}

function normalizeShortcut(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function isValidShortcut(value) {
  return /^[\p{L}\p{N}_ -]+$/u.test(value);
}

function buildTree() {
  const root = { children: new Map(), url: null, path: '' };
  for (const [path, url] of Object.entries(keyValuePairs)) {
    let node = root;
    path.split(' ').forEach((part, index, parts) => {
      if (!node.children.has(part)) node.children.set(part, { children: new Map(), url: null, path: parts.slice(0, index + 1).join(' ') });
      node = node.children.get(part);
    });
    node.url = url;
  }
  return root;
}

function renderTree() {
  tree.replaceChildren();
  const root = buildTree();
  const nodes = Array.from(root.children.values()).sort((a, b) => a.path.localeCompare(b.path));
  if (nodes.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-tree';
    empty.textContent = t('emptyTree');
    tree.appendChild(empty);
  } else {
    nodes.forEach((node) => tree.appendChild(renderNode(node)));
  }
  updateListTitle();
}

function renderNode(node) {
  const item = document.createElement('li');
  const hasChildren = node.children.size > 0;
  if (hasChildren) {
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = node.path.split(' ').at(-1);
    if (node.url) {
      summary.classList.add('branch-with-url');
      summary.appendChild(renderLeaf(node, false));
    }
    details.appendChild(summary);
    const children = document.createElement('ul');
    Array.from(node.children.values()).sort((a, b) => a.path.localeCompare(b.path)).forEach((child) => children.appendChild(renderNode(child)));
    details.appendChild(children);
    item.appendChild(details);
  } else {
    item.appendChild(renderLeaf(node));
  }
  return item;
}

function renderLeaf(node, showName = true) {
  const row = document.createElement('div');
  row.className = 'tree-leaf';
  if (showName) {
    const path = document.createElement('code');
    path.textContent = node.path.split(' ').at(-1);
    row.appendChild(path);
  }
  const link = document.createElement('button');
  link.className = 'url_link';
  link.textContent = node.url;
  link.title = node.path;
  link.addEventListener('click', () => chrome.tabs.create({ url: node.url }));
  const remove = document.createElement('button');
  remove.className = 'deleteButton';
  remove.textContent = '×';
  remove.title = t('deletePath', { path: node.path });
  remove.addEventListener('click', async () => {
    try {
      keyValuePairs = await ShortcutRepository.remove(node.path);
      renderTree();
    } catch (error) {
      alert(error.message);
    }
  });
  row.append(link, remove);
  return row;
}
