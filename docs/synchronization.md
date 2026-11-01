# Shortcut synchronization

The product is now named JumpAlias. Existing `jumpkey*` local storage keys,
`jk:*` sync keys and `jumpkey:shortcuts` messages are intentionally retained
for compatibility; renaming the product must not reset data or device identity.

## Responsibilities

- `sync-rules.js`: pure revision ordering, device expiry, delete eligibility and path keys.
- `sync-store.js`: storage adapter, serialized mutations, migration, local recovery,
  device presence, acknowledgements, conflict repair and garbage collection.
- `service_worker.js`: sole repository owner, extension message endpoint and Chrome event wiring.
- `shortcut-client.js`: small popup request client; no storage policy.
- `popup.js`: input validation, rendering and user-facing failure messages.

Run regression checks with `node --test tests/sync.test.cjs`.

## Cloud format

`jk:path:<encoded path>` stores `{ url, updatedAt, deviceId, deleted }`.
Deletions omit the URL and add a unique `deleteId`. Each path has its own
Chrome Sync item. Changing a path never rewrites the other paths.

`jk:device:<deviceId>` stores `{ lastSeen, seenDeletes }`.
The device ID is generated once and stored in `storage.local`, not shared as
the identity of other installations. Presence is refreshed on activity at most
once per day, except that changed deletion acknowledgements are published promptly.
No timers, external server or additional permissions are required.

Revisions are ordered by timestamp, then device ID. A local edit uses
`max(Date.now(), previous path timestamp + 1)`. Clock skew between offline
devices still affects which concurrent edit wins; timestamps do not measure
absolute real-world order perfectly.

## Deletion and expired devices

An active device has been seen within the last 30 days. A tombstone can be
physically removed from Sync after all active devices acknowledge that exact
`deleteId`. Acknowledgements are written only after the local mirror has
applied the deletion. Local tombstone fences remain after cloud collection,
so an active device can reject delayed stale records and repair Sync.

A device returning after more than 30 days saves its previous mirror and
pending edits as `jumpkeyExpiredDeviceBackup`, then rebuilds from Sync before
uploading new changes. Expired offline edits are not uploaded automatically.
This applies on browser startup, popup opening and subsequent sync events.

Chrome Sync has no compare-and-swap or global transaction. Re-reading revisions
before collection and retaining local fences provide eventual repair, not a
transactional guarantee against every cross-device race. In particular, when
all devices are expired and cloud history has been collected, there is no
authoritative server-side deletion history. This design is for personal use,
not a strongly consistent distributed database.

## Migration, failures and limits

The legacy `keyValuePairs` map is backed up locally as `jumpkeyLegacyBackup`.
Migration writes individual records and `jk:schema` together. Only after that
succeeds is the old cloud map retired. New devices observing the schema marker
must never seed Sync from a stale legacy local map.

Local pending changes survive failed Sync writes and are retried on the next
operation. Storage failures are returned to the popup; it must not report a
successful write after a failure. Recovery data stays local and is never
committed to the repository.

An individual edit exceeding 8 KB is saved to `jumpkeyRejectedEditBackup`
instead of entering the retry queue, so it cannot block subsequent valid edits.

Chrome Sync still limits total storage to about 100 KB, each item to 8 KB and
the number of items to 512. Device entries and tombstones count toward these
limits. A device acknowledgement list can also hit the per-item limit; if it
does, collection stops safely rather than dropping unacknowledged deletions.
Inactive device registrations are retained as small metadata records; they
do not block deletion collection. This is not an unlimited-capacity store.

Cross-device use requires the same extension ID and Chrome Sync enabled on
the relevant profiles. Unpacked installations do not inherently guarantee
the same ID on different machines. This change does not add iCloud sync.
