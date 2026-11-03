let keyValuePairs = {};
let themeMode = 'system';
let tree;
let language = 'zh';
let commandShortcut = '';
let shortcutReadError = false;
let preferredShortcut = '';
let addingShortcut = false;
let sortOrder = 'alphabetical';
let pathTimestamps = {};
let newSyncEnabled = true;
let localPaths = new Set();
let overridePaths = new Set();

const translations = {
  zh: {
    scopeSync: '跨设备同步；点击改为仅此设备', scopeLocal: '仅此设备；点击开启同步',
    scopeOverride: '仅此设备（覆盖同名同步路径）；删除后会显示同步版本',
    makeLocal: '改为仅此设备后，其他设备上的这条同步路径将在同步后移除，本机继续保留。是否继续？',
    scopeConflict: '同名同步路径已存在。\n本机：{local}\n同步：{remote}\n\n请选择要保留的版本。',
    importScope: '本次导入将保存为「{scope}」。是否继续？',
    duplicateUrl: '该地址已收录为：\n{paths}\n\n仍要使用新路径「{path}」添加另一个别名吗？',
    guideTitle: '设置与使用指南', guideSubtitle: '给常用页面一个好记的路径。',
    usageTitle: '快速开始', controlsTitle: '个性化设置', syncTitle: '同步与备份',
    captureInstructions: '<strong>收录页面</strong>：打开插件会自动填入当前 URL，输入 <code>dev github</code> 这样的路径，按 <code>Enter</code> 保存，也可以修改 URL 后再保存。',
    jumpInstructions: '<strong>跳转页面</strong>：按 <code>{addressBarShortcut}</code> 聚焦地址栏，输入 <code>{keyword}</code> 后按 <code>Tab</code> 或空格，再输入 <code>dev github</code>，按 <code>Enter</code> 跳转。',
    treeInstructions: '例如，保存 <code>dev github</code> → github.com、<code>dev docs</code> → developer.mozilla.org，两个路径都会归到 <code>dev</code> 下。父节点也能绑定自己的 URL；点击列表中的 URL 可直接打开。',
    shortcutHelp: '显示 Chrome 实际绑定。自定义组合需在 Chrome 设置页应用，插件内按键录入不会直接修改系统绑定。',
    keywordSummary: 'Tab 和空格是固定的进入方式。修改触发词属于高级设置，需要替换配置并重新加载扩展。',
    appearanceInstructions: '右上角可切换「中 / EN」；主题按「跟随系统 → 白天 → 夜晚」循环，悬停图标查看当前模式。',
    syncInstructions: '亮起的云朵表示跨设备同步，带斜线的云朵表示仅此设备；点击可切换。新增 URL 时，+ 右侧的云朵控制保存位置并记住选择。父节点切换不影响子项。语言通过 Chrome 同步。各设备需登录同一 Google 账号、开启 Chrome 同步，并安装相同扩展 ID 的插件。',
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
    importQuotaWarning: '导入的路径共有 {count} 条（Chrome 同步上限约为 512 项）。继续导入可能超出存储配额导致同步异常，是否继续？',
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
    scopeSync: 'Sync across devices; click to keep only on this device', scopeLocal: 'Only on this device; click to sync',
    scopeOverride: 'Only on this device (overrides synced path); deleting reveals the synced version',
    makeLocal: 'Keep this path only on this device? Its synced copy will be removed from other devices when they sync.',
    scopeConflict: 'A synced path already exists.\nThis device: {local}\nSynced: {remote}\n\nChoose which version to keep.',
    importScope: 'Import these paths as “{scope}”?',
    duplicateUrl: 'This URL is already saved as:\n{paths}\n\nAdd another alias named “{path}” anyway?',
    guideTitle: 'Settings & guide', guideSubtitle: 'Give your pages memorable paths.',
    usageTitle: 'Quick start', controlsTitle: 'Personalize', syncTitle: 'Sync & backup',
    captureInstructions: '<strong>Save a page.</strong> Open the extension to fill in the current URL. Enter a path like <code>dev github</code> and press <code>Enter</code> to save. You can edit the URL first.',
    jumpInstructions: '<strong>Jump to a page.</strong> Press <code>{addressBarShortcut}</code>, enter <code>{keyword}</code>, press <code>Tab</code> or Space, type <code>dev github</code>, then press <code>Enter</code>.',
    treeInstructions: 'For example, save <code>dev github</code> → github.com and <code>dev docs</code> → developer.mozilla.org. Both appear under <code>dev</code>. A parent can have its own URL too. Click a listed URL to open it.',
    shortcutHelp: 'Shows Chrome’s actual binding. Apply custom combinations in Chrome settings; recording keys here does not change the active binding.',
    keywordSummary: 'Tab and Space are fixed activation keys. Changing the keyword is advanced: replace the configuration and reload the extension.',
    appearanceInstructions: 'Use the header to switch 中 / EN or cycle System → Light → Dark. Hover over the theme icon for its current mode.',
    syncInstructions: 'Use the cloud beside + to choose where new URLs are saved. A slashed cloud means only this device. Click a row’s cloud to change its location; children are unaffected. Language syncs through Chrome. Use the same Google account, enable Chrome Sync, and install the same extension ID on each device.',
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
    importQuotaWarning: 'The imported file contains {count} paths (Chrome Sync limit is around 512 items). Continuing may exceed sync quota. Proceed anyway?',
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
  updateSaveLocationControl();
  updateSortControl();
  if (tree) renderTree();
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

function detectPlatform(platform) {
  const value = String(platform).toLowerCase();
  if (value === 'mac' || value.includes('mac')) return 'mac';
  if (value === 'win' || value.includes('win')) return 'win';
  if (value === 'linux' || value.includes('linux')) return 'linux';
  return 'other';
}

let currentPlatform = detectPlatform(typeof navigator === 'undefined' ? '' :
  navigator.userAgentData?.platform || navigator.platform || '');

async function initializePlatform() {
  try {
    const info = await chrome.runtime.getPlatformInfo();
    currentPlatform = detectPlatform(info.os);
  } catch { /* Fall back to the browser platform hint. */ }
  document.documentElement.dataset.platform = currentPlatform;
  document.body.dataset.platform = currentPlatform;
}

function isMac() {
  return currentPlatform === 'mac';
}

function defaultShortcut() {
  return isMac() ? 'Command+Shift+J' : 'Ctrl+Shift+J';
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

function updateSortControl() {
  const button = document.getElementById('sortToggle');
  if (!button) return;
  const labels = language === 'zh'
    ? { alphabetical: '字典序；点击按最近保存排序', newest: '最近保存优先；点击按最早保存排序', oldest: '最早保存优先；点击恢复字典序' }
    : { alphabetical: 'Alphabetical; click for newest first', newest: 'Newest first; click for oldest first', oldest: 'Oldest first; click for alphabetical' };
  button.dataset.order = sortOrder;
  const arrow = sortOrder === 'oldest' ? 'M12 20V4m-5 5 5-5 5 5' : 'M12 4v16m-5-5 5 5 5-5';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    (sortOrder === 'alphabetical' ? 'M8 4v16m-4-4 4 4 4-4M17 20V4m-4 4 4-4 4 4' : arrow) + '"/></svg>';
  button.setAttribute('aria-label', labels[sortOrder]);
  button.onmouseenter = button.onfocus = () => showScopeTooltip(button, labels[sortOrder]);
  button.onmouseleave = button.onblur = hideScopeTooltip;
}

function compareTreeNodes(a, b) {
  if (sortOrder !== 'alphabetical') {
    // Older entries without a recorded time stay last in either direction.
    if (!a.timestamp && b.timestamp) return 1;
    if (a.timestamp && !b.timestamp) return -1;
    const difference = (a.timestamp || 0) - (b.timestamp || 0);
    if (difference) return sortOrder === 'oldest' ? difference : -difference;
  }
  return a.path.localeCompare(b.path);
}

function paintSyncButton(button, enabled, overridden = false) {
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18a4 4 0 0 1-1-7.9A7 7 0 0 1 18.5 8a5 5 0 0 1-.5 10Z"/>' +
    (enabled ? '' : '<path d="m3 3 18 18"/>') + '</svg>';
  button.setAttribute('aria-pressed', String(enabled));
  button.dataset.override = String(overridden);
  const label = t(overridden ? 'scopeOverride' : enabled ? 'scopeSync' : 'scopeLocal');
  button.removeAttribute('title');
  button.setAttribute('aria-label', label);
  button.onmouseenter = button.onfocus = () => showScopeTooltip(button, label);
  button.onmouseleave = button.onblur = hideScopeTooltip;
}

function hideScopeTooltip() {
  document.getElementById('scopeTooltip')?.remove();
  document.querySelectorAll('[aria-describedby="scopeTooltip"]').forEach(element => element.removeAttribute('aria-describedby'));
}

function showScopeTooltip(button, label) {
  hideScopeTooltip();
  const tooltip = document.createElement('div');
  tooltip.id = 'scopeTooltip';
  tooltip.className = 'scope-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = label;
  document.body.appendChild(tooltip);
  button.setAttribute('aria-describedby', tooltip.id);
  const box = button.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  tooltip.style.left = Math.max(8, Math.min(box.right - tooltip.offsetWidth, width - tooltip.offsetWidth - 8)) + 'px';
  const below = box.bottom + 6;
  tooltip.style.top = (below + tooltip.offsetHeight < window.innerHeight - 8 ? below : Math.max(8, box.top - tooltip.offsetHeight - 6)) + 'px';
}

function showScopeConflict(path, button, conflict) {
  document.querySelectorAll('.scope-conflict').forEach(element => element.remove());
  const panel = document.createElement('div');
  panel.className = 'scope-conflict';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', language === 'zh' ? '选择保留版本' : 'Choose a version');
  const message = document.createElement('div');
  message.textContent = language === 'zh' ? '同名同步路径已存在，选择保留版本：' : 'A synced path exists. Choose a version:';
  panel.appendChild(message);
  for (const [resolution, label, url] of [
    ['local', language === 'zh' ? '使用本机版本' : 'Use this device', conflict.localUrl],
    ['sync', language === 'zh' ? '使用同步版本' : 'Use synced version', conflict.syncedUrl]
  ]) {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.textContent = `${label} · ${url}`;
    choice.addEventListener('click', async (event) => {
      event.preventDefault(); event.stopPropagation();
      panel.querySelectorAll('button').forEach(element => { element.disabled = true; });
      try {
        await ShortcutRepository.setScope(path, 'sync', resolution);
        await refreshScopes(); renderTree();
      } catch (error) { showStorageError(error); panel.querySelectorAll('button').forEach(element => { element.disabled = false; }); }
    });
    panel.appendChild(choice);
  }
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = language === 'zh' ? '取消' : 'Cancel';
  cancel.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); panel.remove(); });
  panel.appendChild(cancel);
  button.closest('.tree-leaf').insertAdjacentElement('afterend', panel);
}

function updateSaveLocationControl() {
  const button = document.getElementById('newSyncToggle');
  if (button) paintSyncButton(button, newSyncEnabled);
}

async function refreshScopes() {
  const snapshot = await ShortcutRepository.snapshot();
  keyValuePairs = snapshot.pairs;
  if (!snapshot.timestamps) throw new Error(language === 'zh'
    ? '后台尚未加载时间排序功能，请点击重新加载扩展（保留数据）。'
    : 'The background has not loaded time sorting. Reload the extension to update it.');
  pathTimestamps = snapshot.timestamps;
  localPaths = new Set(snapshot.localPaths);
  overridePaths = new Set(snapshot.overrides);
}

async function changePathScope(path, button) {
  const local = localPaths.has(path);
  hideScopeTooltip();
  button.disabled = true;
  try {
    let result = await ShortcutRepository.setScope(path, local ? 'sync' : 'local');
    if (result.conflict) {
      showScopeConflict(path, button, result.conflict);
      return;
    }
    await refreshScopes();
    renderTree();
  } catch (error) {
    await loadKeyValuePairs();
    showStorageError(error);
  } finally { button.disabled = false; }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initializePlatform();
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
  const savedSort = (await chrome.storage.local.get('pathSortOrder')).pathSortOrder;
  sortOrder = ['alphabetical', 'newest', 'oldest'].includes(savedSort) ? savedSort : 'alphabetical';
  updateSortControl();
  document.getElementById('sortToggle').addEventListener('click', async () => {
    hideScopeTooltip();
    sortOrder = { alphabetical: 'newest', newest: 'oldest', oldest: 'alphabetical' }[sortOrder];
    updateSortControl();
    try {
      await refreshScopes();
      renderTree();
      await chrome.storage.local.set({ pathSortOrder: sortOrder });
      const times = Object.keys(keyValuePairs).map(path => pathTimestamps[path] || 0);
      if (sortOrder !== 'alphabetical' && times.length > 1 && new Set(times).size <= 1) {
        showStorageError(new Error(language === 'zh'
          ? '现有路径没有可区分的保存时间（旧数据或同批导入），暂按字典序排列；之后新增的路径会按时间排序。'
          : 'Existing paths have no distinct save times (legacy data or one import). Alphabetical order is used for ties; new paths will sort by time.'));
      } else document.getElementById('storageNotice').hidden = true;
    } catch (error) { showStorageError(error); }
  });
  newSyncEnabled = (await chrome.storage.local.get('newSyncEnabled')).newSyncEnabled !== false;
  updateSaveLocationControl();
  document.getElementById('newSyncToggle').addEventListener('click', async () => {
    newSyncEnabled = !newSyncEnabled;
    updateSaveLocationControl();
    try { await chrome.storage.local.set({ newSyncEnabled }); } catch (error) { alert(error.message); }
  });
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
    if ((area === 'sync' && Object.keys(changes).some((key) => key.startsWith('jk:path:'))) ||
        (area === 'local' && changes.jumpaliasLocalPaths)) {
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
    if (Object.keys(pairs).length > 400 && !confirm(t('importQuotaWarning', { count: Object.keys(pairs).length }))) {
      return;
    }
    if (!confirm(t('importScope', { scope: language === 'zh' ? (newSyncEnabled ? '跨设备同步' : '仅此设备') : (newSyncEnabled ? 'Sync across devices' : 'Only on this device') }))) return;
    keyValuePairs = await ShortcutRepository.import(pairs, newSyncEnabled ? 'sync' : 'local');
    await refreshScopes();
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
    await refreshScopes();
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
    keyValuePairs = await ShortcutRepository.put(path, url, newSyncEnabled ? 'sync' : 'local');
    if (!newSyncEnabled) localPaths.add(path);
    pathTimestamps[path] = Date.now();
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
      node.timestamp = Math.max(node.timestamp || 0, pathTimestamps[path] || 0);
    });
    node.url = url;
  }
  return root;
}

function renderTree() {
  hideScopeTooltip();
  tree.replaceChildren();
  const root = buildTree();
  const nodes = Array.from(root.children.values()).sort(compareTreeNodes);
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
    Array.from(node.children.values()).sort(compareTreeNodes).forEach((child) => children.appendChild(renderNode(child)));
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
  link.addEventListener('click', (event) => {
    event.stopPropagation();
    chrome.tabs.create({ url: node.url });
  });
  const remove = document.createElement('button');
  remove.className = 'deleteButton';
  remove.textContent = '×';
  remove.title = t('deletePath', { path: node.path });
  remove.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      keyValuePairs = await ShortcutRepository.remove(node.path);
      await refreshScopes();
      renderTree();
    } catch (error) {
      alert(error.message);
    }
  });
  const sync = document.createElement('button');
  sync.type = 'button';
  sync.className = 'icon-button sync-toggle';
  paintSyncButton(sync, !localPaths.has(node.path), overridePaths.has(node.path));
  sync.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    changePathScope(node.path, sync);
  });
  row.append(link, sync, remove);
  return row;
}
