// A single background-owned repository. Chrome transports records; this layer
// resolves revisions, tracks device acknowledgements and maintains local recovery.
(function (root) {
  const R = root.JumpAliasSyncRules;
  const LOCAL_KEY = 'jumpkeySyncState';

  function createSyncStore({ local, sync, now = Date.now,
    uuid = () => crypto.randomUUID() }) {
    let state;
    let initialized = false;
    let persisted = '';
    let queue = Promise.resolve();

    function serialized(work) {
      const next = queue.then(work);
      queue = next.catch(() => {});
      return next;
    }

    async function persist() {
      const snapshot = JSON.stringify(state);
      if (snapshot === persisted) return;
      await local.set({ [LOCAL_KEY]: state });
      persisted = snapshot;
    }

    function checkSize(values) {
      for (const [key, value] of Object.entries(values)) {
        if (new TextEncoder().encode(key + JSON.stringify(value)).length > 8192) {
          throw new Error('A sync item exceeds Chrome’s 8 KB limit. Data remains on this device.');
        }
      }
    }

    async function write(values) {
      if (!Object.keys(values).length) return;
      checkSize(values);
      await sync.set(values);
    }

    async function initialize() {
      if (initialized) return;
      const saved = await local.get([LOCAL_KEY, 'keyValuePairs']);
      state = state || saved[LOCAL_KEY] || {
        deviceId: uuid(), lastActive: 0, records: {}, pending: {}, graveyard: {}
      };
      const cloud = await sync.get(null);
      if (!cloud[R.SCHEMA_KEY]) {
        const legacy = cloud.keyValuePairs || saved.keyValuePairs || {};
        // Keep the original map locally, even after the old cloud key is retired.
        await local.set({ jumpkeyLegacyBackup: legacy });
        const records = {};
        for (const [path, url] of Object.entries(legacy)) {
          if (typeof url !== 'string') continue;
          records[R.keyFor(path)] = {
            url, updatedAt: now(), deviceId: state.deviceId, deleted: false
          };
        }
        // Marker and records succeed together. A quota failure leaves legacy intact.
        await write({ ...records, [R.SCHEMA_KEY]: 1 });
      }
      await persist();
      initialized = true;
    }

    async function reconcile() {
      await initialize();
      const time = now();
      const cloud = await sync.get(null);
      const deviceKey = R.DEVICE_PREFIX + state.deviceId;
      const registered = cloud[deviceKey];
      const expired = state.lastActive && time - state.lastActive > R.DEVICE_TTL;
      if (expired || (registered && !R.isActive(registered, time))) {
        await local.set({ jumpkeyExpiredDeviceBackup: {
          savedAt: time, records: state.records, pending: state.pending,
          graveyard: state.graveyard
        } });
        state.records = {};
        state.pending = {};
        state.graveyard = {};
      }

      const devices = Object.fromEntries(Object.entries(cloud)
        .filter(([key]) => key.startsWith(R.DEVICE_PREFIX)));
      const incoming = Object.fromEntries(Object.entries(cloud)
        .filter(([key, value]) => key.startsWith(R.PATH_PREFIX) && R.isRecord(value)));
      const merged = {};
      const repairs = {};
      const keys = new Set([...Object.keys(incoming), ...Object.keys(state.pending)]);
      for (const key of keys) {
        const remote = incoming[key];
        const localRecord = state.pending[key] || state.records[key] || state.graveyard[key];
        const winner = R.compare(localRecord, remote) > 0 ? localRecord : remote;
        if (!winner) continue;
        merged[key] = winner;
        if (winner.deleted) state.graveyard[key] = winner;
        else if (R.compare(winner, state.graveyard[key]) > 0) delete state.graveyard[key];
        if (R.compare(winner, remote) > 0) repairs[key] = winner;
      }
      // Absence from cloud means collection completed. Never republish cached
      // values merely because they still exist locally. Keep tombstone fences
      // locally to reject delayed old live records arriving after collection.
      state.records = merged;
      if (!state.lastActive || time - state.lastActive >= R.DAY) state.lastActive = time;
      await persist();
      await write(repairs);
      state.pending = {};

      const seenDeletes = Object.values(merged).filter((r) => r.deleted)
        .map((r) => r.deleteId).sort();
      const sameAcks = JSON.stringify(registered?.seenDeletes || []) === JSON.stringify(seenDeletes);
      if (!registered || time - registered.lastSeen >= R.DAY || !sameAcks) {
        const device = { lastSeen: time, seenDeletes };
        await write({ [deviceKey]: device });
        devices[deviceKey] = device;
      }
      await persist();

      const collectible = Object.entries(merged)
        .filter(([, record]) => R.canCollect(record, devices, time));
      if (collectible.length) {
        // Re-read revisions immediately before removal. Chrome Sync offers no
        // cross-device transaction; local fences also protect against late writes.
        const latest = await sync.get(collectible.map(([key]) => key));
        const remove = collectible.filter(([key, record]) => R.compare(latest[key], record) === 0)
          .map(([key]) => key);
        if (remove.length) {
          await sync.remove(remove);
          remove.forEach((key) => delete state.records[key]);
          await persist();
        }
      }

      // Retire the legacy blob only once a schema is present. It must never be
      // consulted again, otherwise a new device could resurrect legacy deletions.
      if (cloud.keyValuePairs && cloud[R.SCHEMA_KEY]) await sync.remove('keyValuePairs');
      return R.pairs(state.records);
    }

    async function mutate(changes) {
      await reconcile();
      const revisions = {};
      for (const [path, url] of Object.entries(changes)) {
        const key = R.keyFor(path);
        const previous = state.records[key] || state.graveyard[key];
        const record = {
          updatedAt: Math.max(now(), (previous?.updatedAt || 0) + 1),
          deviceId: state.deviceId, deleted: url === null,
          ...(url === null ? { deleteId: uuid() } : { url })
        };
        revisions[key] = record;
      }
      try {
        checkSize(revisions);
      } catch (error) {
        // An inherently unsyncable value must not poison the retry queue.
        await local.set({ jumpkeyRejectedEditBackup: { savedAt: now(), records: revisions } });
        throw error;
      }
      for (const [key, record] of Object.entries(revisions)) {
        state.records[key] = record;
        state.pending[key] = record;
        if (record.deleted) state.graveyard[key] = record;
      }
      await persist();
      await write(state.pending);
      state.pending = {};
      await persist();
      return reconcile();
    }

    return {
      list: () => serialized(reconcile),
      put: (path, url) => serialized(() => mutate({ [path]: url })),
      remove: (path) => serialized(() => mutate({ [path]: null })),
      import: (pairs) => serialized(() => mutate(pairs))
    };
  }

  root.createJumpAliasSyncStore = createSyncStore;
  if (typeof module !== 'undefined') module.exports = createSyncStore;
})(globalThis);
