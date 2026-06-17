# 07 — Encryption & Security

> Not in MVP. But because the server holds payloads in plaintext until this lands, this is the **first Phase 2 priority** if anything sensitive ever crosses the channel.

## 1. Threat model (be honest about who we're defending against)

| Adversary | In scope? | Notes |
|---|---|---|
| Random internet stranger guessing a token | ✅ | Mitigate: high-entropy tokens, short TTL, single-claim, rate limits. |
| Me leaking via my own history feature | ✅ | Mitigate: opt-in history, TTL, encrypt-at-rest client-side. |
| Cloudflare / the server operator (me) reading payloads | ⚠️ partial | MVP: server sees plaintext. Phase 2: zero-knowledge so server sees only ciphertext. |
| My employer's network inspecting traffic | ⚠️ | TLS protects in transit; but the work PC itself / corporate proxy with MITM cert could see plaintext in the browser regardless. **No app-level crypto defeats a compromised endpoint.** Don't pretend otherwise. |
| Nation-state / targeted attacker | ❌ | Out of scope. This is a personal convenience tool. |

**Key honesty:** the work PC may sit behind a TLS-inspecting corporate proxy and may be monitored. Client-side encryption protects the payload *in the relay and at rest*, but cannot protect what the work browser itself handles in plaintext. Treat the channel as "good enough for code/snippets," not "safe for secrets I'd be fired over." Don't move things across this that shouldn't be on the work PC at all.

## 2. Approaches considered

### A. No encryption (MVP)
- **Pros:** zero code, ships tonight. Fine for non-sensitive internship text/files that are transient.
- **Cons:** server (me/Cloudflare) and anyone with the token + access sees plaintext; unsafe for history/retention.
- **Verdict:** acceptable MVP only; replace before storing anything or adding history.

### B. Zero-knowledge, key-in-URL-fragment (recommended Phase 2)
- Generate a random symmetric key in the browser. Encrypt payload with **AES-GCM** via the Web Crypto API (built-in, no library).
- The key never goes to the server. It's shared with the other device via the **URL fragment** (`#key=...`) or folded into the pairing token out-of-band.
- Server stores only ciphertext + IV; it cannot decrypt.
- **Pros:** server is fully untrusted; history/retention become safe; standard, well-trodden pattern (same idea as many "send" tools).
- **Cons:** key distribution is the hard part — the receiving device must get the key without the server seeing it. Fragment-after-`#` isn't sent to the server in requests, which is the trick. But if I'm manually typing a short token, a full key is too long to type → need a copy/paste or QR path for the key.
- **Verdict:** target design. Pair token (server-known, for routing) + key (server-unknown, for crypto), kept separate.

### C. Password/passphrase-derived key
- Both devices enter a shared passphrase; derive key via **PBKDF2/Argon2** (Web Crypto supports PBKDF2).
- **Pros:** nothing secret transits the server; I just remember/agree a passphrase.
- **Cons:** weak passphrase = weak crypto; UX of typing a passphrase on both sides each session.
- **Verdict:** good optional mode, especially because I control both devices and can reuse a strong passphrase.

### D. Asymmetric (each device a keypair)
- Devices exchange public keys at pairing; encrypt to the recipient's public key.
- **Pros:** clean for multi-device; no shared secret to type.
- **Cons:** more machinery (key storage per device, exchange integrity) than a two-device personal tool needs.
- **Verdict:** overkill now; revisit only if devices > 2.

## 3. Recommended path
1. **Phase 2a:** Approach B (AES-GCM, random key, zero-knowledge) with key shared via fragment + copy button; passphrase mode (C) as an alternative for when I can't paste the key.
2. Encrypt **before** upload, decrypt **after** download — Worker stays a dumb pipe (also required by the 10ms CPU limit; it literally can't do crypto on payloads at scale).
3. Store IV + ciphertext + algorithm tag together; version the format so it can evolve.

## 4. Public injection / takeover surface (the "database full of stored things" worry)

Even pre-encryption, the relay has an attack surface worth specifying:

| Risk | Mitigation |
|---|---|
| **Token guessing / brute force** | High-entropy tokens (≥ ~40 bits), short unclaimed TTL, single-claim, **rate limit** claim attempts per IP (Cloudflare rate limiting / a KV counter — see `11`). |
| **Unauthorized upload to someone's token** | Require the token; reject uploads to unpaired/expired tokens; cap items + total bytes per token. |
| **Storage abuse / cost blowup** (someone hammering uploads) | Per-token + per-IP quotas, max item size, max items, TTL sweep, daily request cap is a natural backstop (100k/day). |
| **Stored XSS via text/filename** | Treat all text/filenames as untrusted; **render as textContent, never innerHTML**; sanitize/escape on display; set `Content-Disposition: attachment` + safe `Content-Type` on downloads so payloads don't execute in-browser. |
| **Malicious file served back to me** | Always download as attachment, never render server payloads inline as HTML/JS; for image previews use object URLs from blobs, not server-rendered markup. |
| **SSRF / open relay** | Worker only talks to its own R2/KV; no user-controlled outbound fetch. |
| **Path traversal in R2 keys** | Derive keys from server-generated ids, not raw user filenames; store original filename only as metadata. |
| **CSRF on state-changing endpoints** | Token-scoped + same-origin checks; no cookies/ambient auth (token-in-body), so classic CSRF is largely moot. |
| **Replay / stale token reuse** | TTL + single-claim + rotate token per session. |

## 5. Operational hygiene
- Default-delete everything (TTL); retain nothing unless history is explicitly on.
- Log minimally; never log payload contents or full tokens.
- Make "Clear everything for this session" a one-click action.
- Document for myself: *this tool is for convenience, not secrets.*
