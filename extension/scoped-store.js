// Device-only entries are never passed to Chrome Sync. Local entries override
// same-named synced entries on this device without modifying the remote value.
(function (root) {
  const KEY = 'jumpaliasLocalPaths';
  const TRANSFERS = 'jumpaliasLocalTransfers';
  function createScopedStore({ local, synced }) {
    let queue = Promise.resolve();
    const serial = work => {
      const next = queue.then(work);
      queue = next.catch(() => {});
      return next;
    };
    async function locals() { return (await local.get(KEY))[KEY] || {}; }
    async function save(values) { await local.set({ [KEY]: values }); }
    async function finishLocalTransfers() {
      const pending = (await local.get(TRANSFERS))[TRANSFERS] || [];
      for (const path of pending) await synced.remove(path);
      if (pending.length) await local.set({ [TRANSFERS]: [] });
    }
    async function snapshot() {
      await finishLocalTransfers();
      const remote = await synced.list();
      const device = await locals();
      return {
        pairs: { ...remote, ...device },
        localPaths: Object.keys(device),
        overrides: Object.keys(device).filter(path => Object.hasOwn(remote, path))
      };
    }
    async function setScope(path, scope, resolution) {
      if (!['local', 'sync'].includes(scope)) throw new Error('Invalid save location');
      await finishLocalTransfers();
      const device = await locals();
      const remote = await synced.list();
      if (scope === 'local') {
        if (!Object.hasOwn(device, path)) {
          if (!Object.hasOwn(remote, path)) throw new Error('Shortcut no longer exists');
          device[path] = remote[path];
          await local.set({ [KEY]: device, [TRANSFERS]: [path] });
          // Persist the transfer intent with its source before touching Sync.
          await finishLocalTransfers();
        }
      } else if (Object.hasOwn(device, path)) {
        if (Object.hasOwn(remote, path) && remote[path] !== device[path] && !resolution) {
          return { conflict: { localUrl: device[path], syncedUrl: remote[path] } };
        }
        if (resolution && !['local', 'sync'].includes(resolution)) throw new Error('Invalid conflict resolution');
        if (resolution !== 'sync') await synced.put(path, device[path]);
        delete device[path];
        await save(device); // Never discard the local source before upload succeeds.
      }
      return snapshot();
    }
    return {
      list: () => serial(async () => (await snapshot()).pairs),
      snapshot: () => serial(snapshot),
      setScope: (path, scope, resolution) => serial(() => setScope(path, scope, resolution)),
      put: (path, url, scope = 'sync') => serial(async () => {
        if (!['local', 'sync'].includes(scope)) throw new Error('Invalid save location');
        const device = await locals();
        if (scope === 'local' || Object.hasOwn(device, path)) {
          device[path] = url;
          await save(device);
        } else await synced.put(path, url);
        return (await snapshot()).pairs;
      }),
      remove: path => serial(async () => {
        const device = await locals();
        if (Object.hasOwn(device, path)) { delete device[path]; await save(device); }
        else await synced.remove(path);
        return (await snapshot()).pairs;
      }),
      import: (pairs, scope = 'sync') => serial(async () => {
        if (!['local', 'sync'].includes(scope)) throw new Error('Invalid save location');
        const device = await locals();
        const cloud = {};
        for (const [path, url] of Object.entries(pairs)) {
          if (scope === 'local' || Object.hasOwn(device, path)) device[path] = url;
          else cloud[path] = url;
        }
        await save(device);
        if (Object.keys(cloud).length) await synced.import(cloud);
        return (await snapshot()).pairs;
      })
    };
  }
  root.createJumpAliasScopedStore = createScopedStore;
  if (typeof module !== 'undefined') module.exports = createScopedStore;
})(globalThis);
