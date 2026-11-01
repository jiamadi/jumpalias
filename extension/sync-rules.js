// Pure synchronization rules; no Chrome API or UI dependencies.
(function (root) {
  const DAY = 24 * 60 * 60 * 1000;
  const DEVICE_TTL = 30 * DAY;
  const PATH_PREFIX = 'jk:path:';
  const DEVICE_PREFIX = 'jk:device:';
  const SCHEMA_KEY = 'jk:schema';

  function compare(a, b) {
    if (!a) return b ? -1 : 0;
    if (!b) return 1;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? 1 : -1;
    if (a.deviceId !== b.deviceId) return a.deviceId > b.deviceId ? 1 : -1;
    // Deterministic fallback even for malformed duplicate revisions.
    const left = JSON.stringify([a.deleted, a.url || '', a.deleteId || '']);
    const right = JSON.stringify([b.deleted, b.url || '', b.deleteId || '']);
    return left === right ? 0 : left > right ? 1 : -1;
  }

  function isRecord(record) {
    return record && Number.isSafeInteger(record.updatedAt) && record.updatedAt >= 0 &&
      typeof record.deviceId === 'string' && typeof record.deleted === 'boolean' &&
      (record.deleted ? typeof record.deleteId === 'string' : typeof record.url === 'string');
  }

  function isActive(device, now) {
    return device && Number.isFinite(device.lastSeen) && now - device.lastSeen <= DEVICE_TTL;
  }

  function canCollect(record, devices, now) {
    if (!record.deleted || !record.deleteId) return false;
    const active = Object.values(devices).filter((device) => isActive(device, now));
    return active.length > 0 && active.every((device) =>
      Array.isArray(device.seenDeletes) && device.seenDeletes.includes(record.deleteId));
  }

  function pairs(records) {
    return Object.fromEntries(Object.entries(records).filter(([, r]) => !r.deleted)
      .map(([key, r]) => [decodeURIComponent(key.slice(PATH_PREFIX.length)), r.url]));
  }

  function keyFor(path) { return PATH_PREFIX + encodeURIComponent(path); }

  const api = { DAY, DEVICE_TTL, PATH_PREFIX, DEVICE_PREFIX, SCHEMA_KEY,
    compare, isRecord, isActive, canCollect, pairs, keyFor };
  root.JumpAliasSyncRules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
