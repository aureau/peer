# 02 — Architecture

## 1. Chosen architecture (MVP): Cloudflare Worker relay + R2 locker

```
        WORK PC (sender)                      PERSONAL PC (receiver)
        ┌───────────────┐                     ┌───────────────┐
        │  Browser UI    │                     │  Browser UI    │
        │ (served by CF) │                     │ (served by CF) │
        └───────┬────────┘                     └───────┬────────┘
                │  HTTPS (only the browser's normal channel)        │
                ▼                                                    ▼
        ┌─────────────────────────── Cloudflare Worker ───────────────────────────┐
        │  • Serves the static UI (HTML/JS/CSS)                                     │
        │  • API: create pairing, claim token, upload chunk, list, download        │
        │  • Dumb pipe — NO byte processing (10ms CPU budget); just streams/glues   │
        └───────┬───────────────────────────────────┬──────────────────────────────┘
                │                                     │
                ▼                                     ▼
        ┌───────────────┐                     ┌───────────────┐
        │      KV        │                     │       R2       │
        │ pairing state, │                     │ file payloads  │
        │ metadata,      │                     │ (objects),     │
        │ history index, │                     │ TTL-deleted    │
        │ TTL            │                     │                │
        └───────────────┘                     └───────────────┘
```

**Why this shape:**

- **One origin** serves both UI and API → no CORS, no second deploy, no separate signaling server. Less to wire up tonight, fewer network surprises.
- **Everything is plain HTTPS** to a domain I control → if the browser can load a webpage and download a file (confirmed it can), this works. No P2P, no NAT traversal, no TURN.
- **KV** holds tiny, fast-changing state: which token is paired, payload metadata, history index, expiry timestamps.
- **R2** holds the actual bytes. No egress fees, 10GB free, large objects allowed.
- **The Worker never touches payload contents.** It cannot afford to (10ms CPU) and shouldn't (privacy). Encryption/zip/format all happen client-side.

## 2. Connection / handshake model

We are **not** doing a live socket in the MVP. Two simpler options, pick per `05`:

- **Polling (MVP default):** receiver polls "anything new for token X?" every ~2s. Dead simple, no Durable Objects, works everywhere. Slight latency, costs requests (well within 100k/day for one user).
- **Durable Object + WebSocket (Phase 2 nicety):** real-time push, presence ("other PC is here"), cleaner UX. More complex; deferred.

> Decision: **start with polling.** It removes the single most complex MVP component and still feels instant enough for one user.

## 3. Platform limits that shaped the design

Verified against Cloudflare docs (June 2026):

| Limit | Value (Free) | Design impact |
|---|---|---|
| Worker requests | 100,000 / day | Plenty for one user even with 2s polling (~43k/day if polled 24h; we poll only while a tab is open). |
| Worker CPU time | **10 ms / request** | **Worker must not process bytes.** No server-side zip/encrypt/transform. Stream only. |
| Worker memory | 128 MB | Don't buffer whole files in the Worker; stream to/from R2. |
| Request body size | **100 MB** (account-plan capped, Free=100MB) | A 100MB repo is at the ceiling → **must chunk** large uploads (e.g. 5–10MB chunks) and reassemble via R2 multipart. |
| Response body size | No enforced limit (CDN cache 512MB) | Downloads of large objects OK if streamed. |
| Worker code size | 3 MB | Keep the Worker lean; ship UI as static assets, not inlined giant blobs. |
| R2 | 10 GB storage, 1M ops/month | Fine. TTL-delete to stay well under. |
| KV | 1 GB, 100k reads+writes/day | Fine for metadata/state. Watch write count if polling writes; prefer read-only polls. |
| Durable Objects (if used later) | 400k GB-s, 1M req/month | Enough for one user's real-time channel. |

## 4. Alternatives considered

### A. GitHub Pages alone — REJECTED
Static hosting only. No server process, so it **cannot** broker the A↔B connection, hold a payload, or store state. Would still need an external relay/signaling service bolted on, which just becomes "Worker, but split across two hosts." No upside over a single Worker.

### B. GitHub Pages UI + tiny Worker for signaling + WebRTC — REJECTED for MVP
More code (UI + verbose WebRTC peer logic + signaling), and the WebRTC data path can be blocked by corporate NAT with no reliable free TURN fallback tonight. Privacy/size benefits are real but belong to the **Phase-future upgrade** (`09`), not the must-ship-tonight MVP.

### C. Render / Vercel free backend — VIABLE, not chosen
Closest to copypaste.me's own model and totally workable. Not chosen because: Worker keeps UI+API on one origin with no egress fees (R2), spins up with effectively zero cold-start, and the free tiers elsewhere have sleepy instances / bandwidth quirks. Worker = least code, least latency, least firewall risk.

### D. Cloudflare Worker relay + R2 — CHOSEN
Least code, one origin, plain HTTPS, no egress fees, generous free tier, no NAT/TURN dependency. The 10ms CPU limit is a non-issue because we deliberately keep the Worker as a dumb pipe.

## 5. Trust boundaries

- The Worker + R2 are **semi-trusted** in MVP: they see plaintext payloads (no encryption yet). Acceptable for non-sensitive internship text/files short-term.
- Phase 2 encryption moves to **zero-knowledge**: client encrypts before upload, key never leaves the browsers (shared via the token/fragment, see `07`). Then the server is untrusted and only holds ciphertext.
- The **token is the only access control.** Anyone with the token can claim the pairing → tokens must be high-entropy, short-TTL, single-claim. (See `11`.)
