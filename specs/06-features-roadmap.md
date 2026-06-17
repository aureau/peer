# 06 — Features Roadmap (Phase 2 & 3)

Ordered roughly by value-to-effort for *my* workflow.

## Phase 1.5 — finish the MVP's rough edges
- **Connection-status polish** (presence, retry messaging).
- **End-session / manual delete** of items (core clearing is already MVP; this is finer control).

## Phase 2 — ergonomics

### 2.1 Chunked large-file upload (was the 100MB blocker)
- MVP hard-caps uploads at 100MB. Phase 2 adds **R2 multipart chunked upload** to exceed that and get resumability. Flow in `05 §4`.
- Unlocks reliably sending big repos/archives beyond the single-request ceiling.

### 2.2 Folder / repo upload — *enumerate* (basic version already in MVP)
- The **`webkitdirectory` / drag-a-folder → enumerate files with relative paths → send as individual items** path is already in the **MVP regular-sending** scope (see `04 §4`). 
- Phase 2 just polishes it: optional excludes (`node_modules`, `.git`), per-file include toggles, and receiver-side folder reconstruction on download.
- **Note:** the *zip-the-folder-into-one-item* flow is **not here** — it lives in Prompt Mode (`08`), per the decision below.

### 2.3 Images
- Same as files, plus: receiver renders a thumbnail/preview for image MIME types instead of a bare download row.
- Paste-from-clipboard support (`paste` event with image blob) → screenshots fly across instantly. High value.

### 2.4 History (opt-in, TTL)
- A list of recent transfers (text snippets + file names + timestamps), stored in KV index per device.
- **Opt-in** and **auto-expiring** — default off, because history + plaintext storage is a privacy/leak risk (see `07`). When encryption lands, history can store ciphertext + client-held keys.
- Never store full file bytes in history beyond TTL; history is an *index*, bytes live in R2 under the same lifecycle.

### 2.5 Client-side encryption
- Zero-knowledge: encrypt in the browser before upload, decrypt after download; server sees only ciphertext. Full design in `07`. This is what makes history and longer retention safe.

## Phase 3 — Prompt Mode (the dream)
Full spec in `08`. Summary: in-app persistent context buffer of files/folders, replace-by-name on re-drop, one-click formatted copy for pasting repo context into a chat — solving the original "re-download repo to update chat context" pain without any folder sync.

## Parking lot (maybe, maybe not)
- Real-time WebSocket presence via Durable Objects (nicer than polling).
- WebRTC P2P for huge/private transfers (`09`).
- QR code for token (scan with phone) — only if mobile ever matters.
- Multiple named "channels"/rooms — probably unnecessary for a single user.
- Markdown/code syntax highlighting in text previews.

## Rejected (do not build)
- **Automatic background folder sync.** Needs a local agent on the personal PC; can't run on the work PC; the real need is met by Prompt Mode. (`00 §6`.)
