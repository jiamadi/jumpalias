// URL identity rules are independent of UI, Chrome storage and synchronization.
(function (root) {
  function canonicalUrl(value) {
    const text = value.trim();
    try {
      // URL canonicalizes host casing, default ports and the empty root path.
      // Keep protocol, query, fragment and non-root trailing slashes significant.
      return new URL(text.includes('://') ? text : `https://${text}`).href;
    } catch {
      return text;
    }
  }

  function aliasesForUrl(pairs, url) {
    const target = canonicalUrl(url);
    return Object.entries(pairs).filter(([, saved]) => canonicalUrl(saved) === target)
      .map(([path]) => path);
  }

  const rules = { canonicalUrl, aliasesForUrl };
  root.JumpAliasUrlRules = rules;
  if (typeof module !== 'undefined') module.exports = rules;
})(globalThis);
