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
- The token is the shared secret *and* the channel id. **Default flow is asymmetric:** initiator (`/`) sends, joiner (`/connect`) receives. Only one side sends at a time; the receiver can take over via **send from here** (`13`).
- Single-claim: a second `claim` on an already-paired token is rejected (prevents a stray third party hijacking).

## 1b. Role flip flow

```
Receiver tab                 Worker / KV                  Sender tab
   │                            │                              │
   │  POST /api/{key}/sender    │                              │
   │  { peerRole: "joiner" }    │                              │
   │ ─────────────────────────► │ activeSender = joiner        │
   │                            │ receiveSinceSeq = maxSeq     │
   │  { ok, activeSender,       │                              │
   │    receiveSinceSeq }       │                              │
   │ ◄───────────────────────── │                              │
   │                            │  GET /status (poll)          │
   │                            │ ◄─────────────────────────── │
   │                            │  { activeSender: joiner,     │
   │                            │    receiveSinceSeq: N }      │
   │                            │ ────────────────────────────►│
   │  UI → Send workspace       │         UI → Receive workspace│
   ▼                            ▼                              ▼
```

- Only the **current receiver** may call `POST /sender`.
- Both tabs poll `GET /status` to detect flips and switch workspace mode.

## 2. Text send → receive

```
PC A (sender)                 Worker                         PC B (receiver)
 │ type text, click Send       │                              │
 │ POST /{token}/items         │                              │
 │ {type:text, content,         │                              │
 │  peerRole:initiator}        │                              │
 │ ──────────────────────────► │ reject if peerRole ≠         │
 │                             │ activeSender; else store     │
 │                             │ index item under token       │
 │ { itemId, cursor }          │                              │
 │ ◄────────────────────────── │                              │
 │                             │   GET /{token}/items?since=c │
 │                             │   (c = max(cursor,           │
 │                             │    receiveSinceSeq))         │
 │                             │ ◄─────────────────────────── │  (poll ~2s)
 │                             │   { items:[{text,...}] }     │
 │                             │ ────────────────────────────►│
 │                             │                  render + Copy│
 ▼                             ▼                              ▼
```

## 3. File send → receive (small, single request)

```
PC A (sender)                 Worker                  R2          PC B (receiver)
 │ drop file                   │                       │           │
 │ POST /{token}/items         │                       │           │
 │ (peerRole + bytes)          │                       │           │
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
- In receive mode, pass `since = max(localCursor, receiveSinceSeq)` so each receiver stint only surfaces post-flip items (`13`).
- Poll cadence: ~2s while tab focused; back off to ~10s when blurred; pause when hidden (Page Visibility API) to conserve request budget.
- **Sender tab** polls status only (flip detection + session end). **Receiver tab** polls status + items.

## 6. State stored

**KV (small, fast):**
- `pair:{token}` → `{ status, created, lastActive, activeSender, receiveSinceSeq }` (TTL)
- `items:{token}` → ordered index of `{ itemId, type, name?, size?, mime?, seq, r2key? }` (TTL)
- small text payloads inline; large text spills to R2.

**R2 (bytes):**
- `{token}/{itemId}/{filename}` → file/object bytes (lifecycle-expired).

## 7. Cleanup flow

- KV TTL handles metadata expiry automatically.
- A scheduled **Cron Trigger** (free tier allows a few) sweeps R2 for objects whose session metadata has expired → deletes orphans, keeps storage near zero.
- **End of session (explicit "End session," expiry, or either device disconnecting):** `POST /api/{key}/end` (or the TTL/cron path) deletes the KV index **and** all R2 objects for that session immediately — no residue. Both devices then reset their UI to the **Unpaired (start) state**. Nothing carries into the next session. (MVP keeps no history.)
