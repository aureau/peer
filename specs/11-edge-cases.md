# 11 — Edge Cases, Limits & Abuse

## 1. Network / connection

| Case | Handling |
|---|---|
| Work firewall blocks `workers.dev` | Fallback: custom domain on Cloudflare free DNS (cheap domain). Test the deployed URL on the work PC **first thing** — this is the make-or-break check. |
| Corporate proxy MITMs TLS | App still works (it's just HTTPS), but be aware payload may be visible to the proxy. Reinforces "not for secrets" (`07 §1`). |
| Poll requests fail intermittently | Retry with backoff; show "reconnecting"; don't drop the session — KV state persists across reconnects. |
| Receiver tab closed during transfer (relay) | Fine — items persist in R2/KV until TTL; receiver picks them up when it returns. (This is a relay advantage over WebRTC.) |
| Both tabs idle a long time | Session TTL expires; show "expired, start new session." |

## 2. Pairing (fixed key or random token)

| Case | Handling |
|---|---|
| Key/token typo | Reject, ask to re-enter; random-token alphabet is unambiguous; fixed key can be pasted/remembered. |
| Session already claimed by another device | Reject second concurrent claim (single active pairing) → prevents hijack. |
| Session expired before join (3-min timeout) | "Session expired — start a new one." Reset to start state. |
| **Fixed key leaks** | Key alone can't access past data (sessions are transient + wiped on end); change the configured key if a leak is suspected. Documented tradeoff in `04 §2` / `07`. |
| Two initiators race (random-token mode) | Tokens random + uniqueness-checked on mint; collision → remint. |
| Stale session lingering when I start a new one with the same fixed key | Starting a fresh session supersedes/clears any prior session for that key. |

## 2b. Role flip (send/receive workspaces)

| Case | Handling |
|---|---|
| Receiver clicks **send from here** | `POST /sender` sets `activeSender = peerRole`, bumps `receiveSinceSeq`; both tabs poll status and swap UI. |
| Sender tries to flip | No flip button on sender; `POST /sender` rejected with `403 NOT_ACTIVE_SENDER` if caller is already sender. |
| Send from non-active side | `POST /items` with wrong `peerRole` → `403 NOT_ACTIVE_SENDER`. |
| Double flip race | KV serializes writes; last flip wins. |
| Refresh mid-session | Status poll restores `activeSender` + `receiveSinceSeq`; receive workspace uses updated seq floor. |
| Items from prior sender stint | Stay in session index; hidden from new receiver via `receiveSinceSeq` filter (not deleted). |
| End session | Full wipe including role fields; both tabs reset to unpaired start. |

See `13` for full role model.

## 3. Files & size

| Case | Handling |
|---|---|
| File > 100MB request-body limit | **MVP: reject with a clear error** (hard cap). Chunked upload to exceed this is Phase 2. |
| Total session storage creeping up | Per-session byte + item quotas; TTL sweep; full wipe on session end; daily request cap as backstop. |
| Zero-byte / weird files | Allow; just transfer bytes faithfully. |
| Filename with unsafe chars / path traversal | R2 key from server id, original name stored as metadata only; sanitize on display. |
| Duplicate filenames in one session | Keyed by item id, not name — no collision. |
| Mid-upload failure (chunked, Phase 2) | Retry only the failed part; `complete` only after all parts ack. |
| Browser memory on huge buffer (Prompt Mode) | Warn + use IndexedDB + offer excludes before reading thousands of files. |

## 4. Content safety / abuse

| Case | Handling |
|---|---|
| Brute-forcing the join key/token | Long high-entropy key; rate-limit claim attempts per IP (KV counter or CF rate limiting); 3-min unclaimed TTL; single active pairing. |
| Upload spam to a known session | Reject uploads to unpaired/expired sessions; per-IP + per-session quotas; 100MB cap. |
| Stored XSS via text/filename | Render via `textContent`, never `innerHTML`; escape on display. |
| Payload served back executes in browser | Force `Content-Disposition: attachment`, safe `Content-Type`; preview images via blob object URLs only, never server HTML. |
| Cost blowup (someone hammering my Worker) | Rate limiting + quotas; 100k req/day is a natural ceiling; alert if approaching. |
| Someone else discovers my deployed URL | URL alone does nothing without a valid live session; the fixed key still requires a session I started, which expires + is single-claim. |

## 5. Data lifecycle

| Case | Handling |
|---|---|
| Orphaned R2 objects after KV TTL | Cron Trigger sweeps R2 for objects with no live metadata. |
| Immediate wipe wanted | "End session" deletes KV index + R2 objects for the session now and resets both devices to start. |
| Session ends (any cause) | Full wipe of all KV+R2 for that session; nothing retained (MVP keeps no history). |
| History (Phase 2) retains too long | TTL on history index; default off; encrypt before retaining (`07`). |

## 6. Browser quirks

| Case | Handling |
|---|---|
| Clipboard API blocked (no HTTPS/permission) | We're on HTTPS (workers.dev) → fine; fallback to a manual "select all" textarea if `navigator.clipboard` denied. |
| `webkitdirectory` unsupported | Fallback to multi-file picker (select files manually); show note. (Zip is Prompt-Mode only, not a regular-send fallback.) |
| File System Access API (Prompt Mode) Chromium-only | Degrade gracefully to in-memory + IndexedDB; no hard dependency. |
| Page Visibility throttling background polls | Intended — pause/slow polls when hidden to save request budget. |

## 7. The single biggest risk
**The deployed URL not loading or not transferring on the actual work network.** Mitigation: test end-to-end on the work PC before relying on it; have the custom-domain fallback ready; the relay (vs WebRTC) choice already removes the largest network risk.
