# 10 — UI / UX

## 1. Screens / states

### MVP screens
1. **Landing / mode pick** — "Send/Receive" (Transfer Mode). (Prompt Mode toggle appears once built.)
2. **Pairing**
   - *Initiator view:* "Start session" → shows status "Waiting for other device…" with a **3-minute countdown**. If using the random-token option, the token is displayed large with "Copy".
   - *Joiner view:* key/token input + "Connect". (With the fixed personal key, this is just entering my known secret.)
3. **Paired workspace** (role-based — see `13`)
   - Each tab shows **either** a send workspace **or** a receive workspace, never both at once.
   - **Send workspace** (when `peerRole === activeSender`): textarea, whole-window drop target, file picker, folder picker.
   - **Receive workspace** (when `peerRole !== activeSender`): received items list (newest first), copy/download; **send from here** flip button (receiver only).
   - Status bar (paired / retrying / expired).
   - **end session** button → wipes everything and returns both devices to the start screen.

   **Default after pairing:** initiator (`/`) → send; joiner (`/connect`) → receive.

> **Supersedes:** earlier wording that placed send area + received list together on one screen for both tabs. That shared layout was an interim #28 implementation; see `13` migration note.

### State machine
```
UNPAIRED ──start──► WAITING(3-min countdown) ──other joins──► PAIRED ──inactivity TTL──► EXPIRED
   ▲                       │                                      │                          │
   │                       └────── 3-min timeout ─────────────────┤                          │
   └──────────── end session / expiry: WIPE ALL DATA, reset to UNPAIRED ◄─────────────────────┘
```
> Any terminal transition (timeout, expiry, end-session, disconnect) clears all KV+R2 for the session and resets the UI to UNPAIRED. Nothing persists.

## 2. Key interactions

- **Drag & drop:** whole window is a drop target when in **send workspace**; dropping highlights the zone. Show file count + total size before send. Reject anything over the **100MB cap** with a clear inline message.
- **Folder send:** folder picker (`webkitdirectory`) or dropping a folder enumerates files with relative paths and sends them as items. Send workspace only.
- **Paste:** `paste` event captures text and (Phase 2) images directly — paste a screenshot, it queues as a file. Send workspace only.
- **Send:** explicit button; optional Ctrl/Cmd+Enter for text. Send workspace only; server rejects if not `activeSender`.
- **Receive:** items appear via poll on **receive workspace** only; each has Copy (text) or Download (file). Filter `seq > receiveSinceSeq`. Subtle "new" pulse on arrival.
- **Role flip:** current receiver clicks **send from here** → both tabs swap send/receive mode via status poll.
- **Join key/token:** if using the random token, one-tap copy + show it large enough to read across a desk. The fixed personal key is entered from memory/paste; offer a "remember key on this device" convenience (local only).

## 3. Status & feedback (don't skimp — this is where copypaste.me feels good)
- Connection status always visible (a dot + label): grey=unpaired, amber=waiting (with countdown), green=paired, red=lost/retrying.
- Upload progress bar per file.
- Clear empty states:
  - Send: *paired. nothing sent yet — drop a file, folder, or type text.*
  - Receive: *waiting for items…*
- Error toasts that say what to do ("Session expired — start a new one", "File exceeds 100MB limit").

## 4. Layout principles
- Single column, desktop-first.
- Minimal chrome; each tab shows **send OR receive**, not both — see `13`.
- Send workspace: generous drop target. Receive workspace: item list is the focus.
- Prompt Mode (Phase 3) uses a **two-pane** layout (buffer left, formatted preview right) — see `08`.

## 5. Visual direction (light touch)
- Clean, utilitarian, fast. No splashy branding needed (personal tool).
- High-contrast status colors so I can tell state at a glance.
- Monospace for key/token + text/code previews.

## 6. Accessibility / ergonomics
- The random-token option uses an unambiguous alphabet (no `O/0`, `l/1/I`); the fixed personal key is my own choice (keep it long).
- Keyboard: Tab order sane, Enter/Ctrl+Enter to send, Esc to clear.
- Respect `prefers-reduced-motion` for the arrival pulse.

## 7. Mobile (bonus, not a goal)
- If layout reflows acceptably, fine. A QR code for the token would make phone-pairing nice later, but not a priority.
