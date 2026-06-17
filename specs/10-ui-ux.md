# 10 — UI / UX

## 1. Screens / states

### MVP screens
1. **Landing / mode pick** — "Send/Receive" (Transfer Mode). (Prompt Mode toggle appears once built.)
2. **Pairing**
   - *Initiator view:* "Start session" → shows status "Waiting for other device…" with a **3-minute countdown**. If using the random-token option, the token is displayed large with "Copy".
   - *Joiner view:* key/token input + "Connect". (With the fixed personal key, this is just entering my known secret.)
3. **Paired workspace**
   - Send area (textarea + drop zone + file picker + **folder picker**).
   - Received items list (newest first).
   - Status bar (paired / retrying / expired).
   - **"End session"** button → wipes everything and returns both devices to the start screen.

### State machine
```
UNPAIRED ──start──► WAITING(3-min countdown) ──other joins──► PAIRED ──inactivity TTL──► EXPIRED
   ▲                       │                                      │                          │
   │                       └────── 3-min timeout ─────────────────┤                          │
   └──────────── end session / expiry: WIPE ALL DATA, reset to UNPAIRED ◄─────────────────────┘
```
> Any terminal transition (timeout, expiry, end-session, disconnect) clears all KV+R2 for the session and resets the UI to UNPAIRED. Nothing persists.

## 2. Key interactions

- **Drag & drop:** whole window is a drop target when paired; dropping highlights the zone; dropping outside the zone still works. Show file count + total size before send. Reject anything over the **100MB cap** with a clear inline message.
- **Folder send:** a folder picker (`webkitdirectory`) or dropping a folder enumerates files with relative paths and sends them as items.
- **Paste:** `paste` event captures text and (Phase 2) images directly — paste a screenshot, it queues as a file.
- **Send:** explicit button; optional Ctrl/Cmd+Enter for text.
- **Receive:** items appear via poll; each has Copy (text) or Download (file). A subtle "new" pulse on arrival.
- **Join key/token:** if using the random token, one-tap copy + show it large enough to read across a desk. The fixed personal key is entered from memory/paste; offer a "remember key on this device" convenience (local only).

## 3. Status & feedback (don't skimp — this is where copypaste.me feels good)
- Connection status always visible (a dot + label): grey=unpaired, amber=waiting (with countdown), green=paired, red=lost/retrying.
- Upload progress bar per file.
- Clear empty states ("Paired. Nothing sent yet — drop a file, folder, or type text.").
- Error toasts that say what to do ("Session expired — start a new one", "File exceeds 100MB limit").

## 4. Layout principles
- Single column, generous drop zone, desktop-first.
- Minimal chrome; the drop zone + received list are the whole app.
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
