# 05 — Data Flow

> **Note on `{token}` in the diagrams below:** the channel id is either my **fixed personal key** (default) or a freshly-minted random **token** — they're interchangeable as the routing id, so `{token}` in these diagrams means "whichever join secret is in use." Unclaimed sessions expire after **3 minutes**. See `04 §2`.

## 1. Pairing flow

```
PC A (work)                 Worker / KV                  PC B (personal)
   │                            │                              │
   │  POST /api/pair            │                              │
   │ ─────────────────────────► │                              │
   │                            │ mint token K7P-9QF           │
   │                            │ KV: {K7P-9QF: waiting, TTL10m}│
   │  { token: K7P-9QF }        │                              │
   │ ◄───────────────────────── │                              │
   │                            │                              │
   │  (I read token to myself / copy it, then type it on PC B) │
   │                            │       POST /pair/K7P-9QF/claim│
   │                            │ ◄─────────────────────────── │
   │                            │ KV: status=paired, TTL roll  │
   │                            │       { ok }                 │
   │                            │ ────────────────────────────►│
   │   GET /status (poll)       │      GET /status (poll)      │
   │ ─────────────────────────► │ ◄─────────────────────────── │
   │   { paired }               │      { paired }              │
   │ ◄───────────────────────── │ ────────────────────────────►│
   │                            │                              │
   ▼  both show "Paired"        ▼                              ▼
```

Notes:
- The token is the shared secret *and* the channel id. Either device can send/receive (channel is bidirectional even if my usual direction is work→personal).
- Single-claim: a second `claim` on an already-paired token is rejected (prevents a stray third party hijacking).

## 2. Text send → receive

```
PC A                          Worker                         PC B
 │ type text, click Send       │                              │
 │ POST /{token}/items         │                              │
 │ {type:text, content}        │                              │
 │ ──────────────────────────► │ store value (KV or R2)       │
 │                             │ index item under token       │
 │ { itemId, cursor }          │                              │
 │ ◄────────────────────────── │                              │
 │                             │   GET /{token}/items?since=c │
 │                             │ ◄─────────────────────────── │  (poll ~2s)
 │                             │   { items:[{text,...}] }     │
 │                             │ ────────────────────────────►│
 │                             │                  render + Copy│
 ▼                             ▼                              ▼
```

## 3. File send → receive (small, single request)

```
PC A                          Worker                  R2          PC B
 │ drop file                   │                       │           │
 │ POST /{token}/items (bytes) │                       │           │
 │ ──────────────────────────► │ stream put ──────────►│           │
 │                             │ KV: meta{name,size,id}│           │
 │ { itemId }                  │                       │           │
 │ ◄────────────────────────── │                       │           │
 │                             │      GET items?since (poll) ◄──────│
 │                             │      { items:[{file meta}] } ─────►│
 │                             │                       │  click DL  │
 │                             │ GET items/{id}/download◄───────────│
 │                             │ stream get ◄──────────│           │
 │                             │ ──────── file stream ─────────────►│
 ▼                             ▼                       ▼           ▼
```

## 4. Large file (chunked) — Phase 2 (NOT in MVP)

> **MVP behavior:** uploads are **hard-capped at 100MB** (the Free request-body limit) and rejected above that with a clear message. The chunked flow below is **deferred to Phase 2** to keep tonight simple.

When added in Phase 2, because request body is capped at 100MB and we want headroom + resumability:

```
PC A                                   Worker / R2
 │ POST /{key}/items {file meta, size}  → { itemId, uploadId }   (R2 multipart init)
 │ for each ~8MB chunk:
 │   PUT /{key}/items/{itemId}/chunk?part=n  → stream to R2 multipart part n
 │ POST /{key}/items/{itemId}/complete {parts}  → R2 completeMultipartUpload
 │ item becomes visible to receiver
```

- Chunk size tuned under the 100MB body limit (8–16MB is safe, keeps each request small + retryable).
- Receiver download streams the assembled object normally.
- Resumable: a failed chunk retries just that part.

## 5. Polling cursor model

- Each item gets a monotonic `seq` (or timestamp+id) under the token.
- Receiver tracks the highest `seq` seen (`cursor`).
- `GET /items?since=cursor` returns only newer items → cheap, no dupes.
- Poll cadence: ~2s while tab focused; back off to ~10s when blurred; pause when hidden (Page Visibility API) to conserve request budget.

## 6. State stored

**KV (small, fast):**
- `pair:{token}` → `{ status, created, lastActive }` (TTL)
- `items:{token}` → ordered index of `{ itemId, type, name?, size?, mime?, seq, r2key? }` (TTL)
- small text payloads inline; large text spills to R2.

**R2 (bytes):**
- `{token}/{itemId}/{filename}` → file/object bytes (lifecycle-expired).

## 7. Cleanup flow

- KV TTL handles metadata expiry automatically.
- A scheduled **Cron Trigger** (free tier allows a few) sweeps R2 for objects whose session metadata has expired → deletes orphans, keeps storage near zero.
- **End of session (explicit "End session," expiry, or either device disconnecting):** `POST /api/{key}/end` (or the TTL/cron path) deletes the KV index **and** all R2 objects for that session immediately — no residue. Both devices then reset their UI to the **Unpaired (start) state**. Nothing carries into the next session. (MVP keeps no history.)
