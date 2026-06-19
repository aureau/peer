# 04 — MVP Spec (Phase 1, tonight)

Scope: the minimum that replaces copypaste.me for my two PCs. Text + files, paired by token, over HTTPS.

## 1. Feature list

| # | Feature | Must-have? |
|---|---|---|
| 1 | Start a session on one PC (fixed personal key, or random token) | ✅ |
| 2 | Join from the other PC by entering the same key/token → paired | ✅ |
| 3 | Send a block of text | ✅ |
| 4 | Send one or more files via drag & drop or file picker | ✅ |
| 4b | Send a **folder** (enumerate files + relative paths) — regular sending | ✅ |
| 5 | Receiver sees incoming items and can **copy text** / **download files** | ✅ |
| 5b | Role-based send/receive workspaces; receiver flips send via **send from here** | ✅ |
| 6 | Items auto-expire (TTL); 3-min unclaimed countdown shown | ✅ |
| 7 | Clear visual pairing/connection status | ✅ |
| 8 | End-of-session clears everything + resets to start state | ✅ |
| 9 | Works on the work network end-to-end | ✅ (the real bar) |

Anything not in this table is Phase 2+. **Not tonight:** image previews, history UI, encryption, chunked uploads >100MB, client-side zip/Prompt Mode.

## 2. Join key / pairing

Since it's **only me** using this across two of my own devices, the default join method is a **fixed personal key** rather than a fresh random token each time.

### Default: fixed personal key
- I set a single long secret string once (e.g. `xmWHJBk92AbndjsaA`) — stored as a config/env value the app knows.
- PC A starts a session; PC B joins by entering that same fixed key. Match → paired.
- **Why this is fine for me:** no token to read across the desk each time; muscle-memory or paste the same string.
- **Honest tradeoff (note, don't ignore):** a *fixed* key never rotates, so if it ever leaks (typed somewhere public, shoulder-surfed, logged), anyone with it can join my sessions indefinitely. Mitigations baked in:
  - The key alone does nothing without a **live session** — sessions still expire (unclaimed after **3 min**, see §7), so a leaked key can't passively harvest old data.
  - Single active pairing at a time; reject a second concurrent claim.
  - Keep the key long + high-entropy; make it easy to change in config if I ever suspect a leak.

### Alternative (kept available): short random token
- For situations where I don't want a persistent secret, fall back to a freshly-minted short token: 6–8 chars from an unambiguous alphabet (no `0/O`, `1/l/I`), e.g. `K7P-9QF`, expiring in 3 min.
- Same channel mechanics; just a per-session secret instead of a fixed one.

> **Recommendation:** ship the fixed-personal-key path first (fewer steps for me), keep the random-token generator as a one-line alternative for flexibility/safety.

### Lifecycle (both methods)
1. PC A opens app → session created, KV stores `{key/token → {created, status:"waiting"}}` with **3 min** unclaimed TTL (countdown shown to user).
2. PC B enters the key/token → `status:"paired"`, TTL switches to rolling inactivity (e.g. 30–60 min).
3. Once paired, the key/token is the channel id for upload/poll/download.

## 3. Sending text

- Textarea + "Send" button (send workspace only — see `13`).
- On send: `POST /api/{token}/items` with `{ type:"text", content:"...", peerRole }`. Only accepted when `peerRole === activeSender`. Stored as a small KV value (or R2 if large), metadata indexed under the token.
- No formatting transforms server-side; text is stored and returned verbatim (preserve whitespace/newlines).

## 4. Sending files

- Drag-drop zone + `<input type=file multiple>` fallback (send workspace only).
- Per file: `POST /api/{token}/items` (multipart or raw body) with `peerRole` → Worker streams into R2 under a key like `{token}/{itemId}/{filename}`; metadata `{type:"file", name, size, mime, itemId}` indexed in KV.
- **Size handling tonight:** **hard cap at 100MB per upload** (the Free request-body limit). Reject larger files with a clear message. No chunking in MVP — deferred to Phase 2. Typical use (<10MB) is trivial; a single file up to 100MB works in one request.
- Multiple files = multiple items under the same session.
- **Folder upload (allowed in regular sending):** drag a folder or use `webkitdirectory` to enumerate all files with their relative paths, then send them as individual items (relative path preserved as metadata). This is *not* zipping — it's just multi-file send that understands folder structure. The zip/unzip flow is reserved for Prompt Mode (`08`). Keep each file under the 100MB cap.

## 5. Receiving

- Only the **receive workspace** tab polls items (`peerRole !== activeSender`). See `13`.
- Receiver polls `GET /api/{token}/items?since={cursor}` every ~2s while tab is open. Pass `since = max(localCursor, receiveSinceSeq)` so each receiver stint only shows items after the last role flip.
- New items render in a list, newest first:
  - **Text item:** preview + "Copy" button (uses Clipboard API).
  - **File item:** name, size, relative path (folder sends), "Download" button → `GET /api/{token}/items/{itemId}/download` streams the R2 object with `Content-Disposition: attachment`.
- After successful copy/download, item can be marked seen (cosmetic) but stays until TTL.
- **Role flip:** current receiver clicks **send from here** → `POST /api/{token}/sender` → both tabs sync via status poll.

## 6. Status / connection UX (minimum)

- Three states surfaced clearly: **Unpaired** → **Waiting for other device** → **Paired (active)**.
- If polling fails repeatedly, show "Connection lost — retrying."
- Show token prominently on the initiating device with a "Copy token" button.

## 7. TTL / cleanup & session end

- **Unclaimed session: expire after 3 minutes** — show a visible countdown to the user ("Session expires in 2:58…"). If no one joins, the session dies.
- Paired session items: expire after N minutes of inactivity (e.g. 30–60 min) — KV TTL + an R2 lifecycle/Cron sweep for orphaned objects.
- **No history retained in MVP** (history is Phase 2, opt-in).
- **Explicit end-of-session behavior:** when a session ends — whether by expiry, by either device disconnecting/timing out, or by an explicit "End session" — **everything for that session is cleared**: all KV metadata and all R2 objects deleted, no residue. The UI on both devices then **resets to the beginning (Unpaired) state**, ready to start fresh. Nothing carries over into the next session.

## 8. Explicit MVP non-features

- No encryption (plaintext through server — acceptable short-term, fixed in `07`).
- No chunked upload — **hard 100MB cap per upload** in MVP (chunking deferred to Phase 2).
- No image previews (files download as-is).
- No client-side zip (zip/unzip flow lives in **Prompt Mode**, Phase 3 — see `08`). *Folder upload itself* (drag a folder, enumerate files) is allowed in regular sending — see §4.
- No accounts, no real-time WebSocket (polling only).
- No mobile-optimized layout.

## 9. API surface (MVP)

> Routes are Next.js **route handlers** (`src/app/api/...`), compiled into the Worker by OpenNext. `{key}` is the fixed personal key or random token — same param either way.

```
POST   /api/pair                     → { key }            (start session w/ configured key, or mint random token)
POST   /api/pair/{key}/claim         → { ok }             (other PC joins; sets activeSender=initiator)
GET    /api/{key}/status             → { status, expiresIn, activeSender, receiveSinceSeq }
POST   /api/{key}/sender             → { ok, activeSender, receiveSinceSeq }  (receiver flips send role)
POST   /api/{key}/items              → { itemId }         (text or file, ≤100MB; requires peerRole)
GET    /api/{key}/items?since=cursor → { items:[...] }    (poll; receive workspace only)
GET    /api/{key}/items/{id}/download → file stream
POST   /api/{key}/end                → { ok }             (clear all KV+R2, reset both devices)
```

Chunked-upload variants (`/items/{id}/chunk?part=n`, `/items/{id}/complete`) added in **Phase 2** when large-file support lands.
