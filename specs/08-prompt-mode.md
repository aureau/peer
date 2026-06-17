# 08 — Prompt Mode (The Dream Feature)

> Phase 3. The reason this project is worth building beyond "copypaste.me but mine." Solves the real pain: constantly re-downloading/renaming a repo to feed updated context into a chat.

## 1. The problem it kills

Current loop, every time I tweak a repo and want a chat to see the changes:
> edit files → download repo → rename → re-upload to chat → paste → realize I missed a file → repeat.

Prompt Mode keeps the repo **living in the app** as a context buffer and gives me a clean, formatted, paste-ready blob on demand. No folder sync, no re-download.

## 2. Mental model

A second mode of the same web app. Toggling "Prompt Mode" flips the UI into a **context workspace** that is *local-first* (files live in the browser, not necessarily sent anywhere).

```
┌─────────────────────────────────────────────────────────────┐
│  [ Transfer Mode | ●Prompt Mode ]                  [Copy ⧉]   │
├───────────────────────────┬─────────────────────────────────┤
│  CONTEXT BUFFER (left)     │  FORMATTED OUTPUT PREVIEW (right)│
│                            │                                  │
│  ▾ my-repo/                │  # Context: my-repo              │
│    ▾ src/                  │                                  │
│      app.js      [×]       │  ## File tree                    │
│      utils.js    [×]       │  my-repo/                        │
│    package.json  [×]       │   src/app.js                     │
│  ▾ notes.md      [×]       │   src/utils.js  ...              │
│                            │                                  │
│  drop files/folders here   │  ## src/app.js                   │
│  to add or replace         │  ```js                           │
│                            │  ...file contents...             │
│  est. ~12.4k tokens        │  ```                             │
└───────────────────────────┴─────────────────────────────────┘
```

## 3. Core behaviors

### 3.1 Build the buffer
- Drag-drop files or a folder, or pick via `webkitdirectory`.
- Files are read **into the browser** (FileReader / File System Access API) and held in memory + IndexedDB (so the buffer survives a refresh).
- Folder structure (relative paths) is preserved and shown as a tree.

### 3.2 Replace-by-name (the key trick)
- When I drop a file/folder whose **name + relative path matches** something already in the buffer:
  - Prompt: **"`src/app.js` already in buffer — Replace?"** (with Replace / Keep both / Cancel).
  - Replace updates in place, so the buffer always reflects my latest edits.
- Optional "auto-replace matching names" toggle for fast iterative loops (no prompt, just update).
- A subtle diff indicator ("updated 2s ago") so I can see what changed.

### 3.3 Exclusions
- Default-skip noise: `node_modules`, `.git`, build dirs, binaries, lockfiles (configurable).
- Respect `.gitignore` if present (nice-to-have).
- Per-file include/exclude checkboxes in the tree.

### 3.4 One-click formatted copy
- "Copy" serializes the buffer into a **chat-context-friendly** format:
  - Optional header + file tree summary.
  - Each file as a path heading + fenced code block with language inferred from extension.
  - Skips/marks binary files ("[binary omitted]").
- Copies to clipboard (Clipboard API). Also a "Download as .md/.txt" option.
- **Token/size estimate** shown live (rough heuristic: chars ÷ ~4) so I don't blow a context window.

### 3.5 Format options
- Toggle: include tree / omit tree.
- Toggle: full contents vs. just signatures/headers (for huge repos).
- Per-file collapse so I can exclude a giant file from the blob without removing it from the buffer.

## 4. Relationship to Transfer Mode

### 4.1 The zip → send → unzip flow (lives here, by decision)
The **client-side zip** capability (JSZip) belongs to Prompt Mode, not regular sending. The flow, confirmed:

```
PC A (Prompt Mode)                              PC B (Prompt Mode)
  folder in context buffer
        │
        ▼
  zip client-side (JSZip)  ──► one .zip item
        │
        ▼  send over normal transfer channel (Phase 1/2 plumbing)
        │
        ▼
                                          receive .zip
                                                │
                                                ▼
                                          unzip client-side (JSZip)
                                                │
                                                ▼
                                          files land in PC B's context
                                          buffer + render — read in-app,
                                          no download-to-disk needed
```

- So yes: **zip the folder → send → unzip on the other PC → read files in-app.** The receiver never has to download/extract manually; Prompt Mode reads the zip contents straight into its buffer.
- Bonus: because both sides understand the buffer, **replace-by-name** (§3.2) applies — re-sending an updated repo updates the matching files in PC B's buffer in place.

### 4.2 Other notes
- Prompt Mode is **local by default** — no relay needed; files never have to leave the browser unless I push them.
- "Push buffer to my other PC" reuses the transfer channel; with the zip flow above it's a single `.zip` item (subject to the 100MB cap until chunking lands in Phase 2).
- Regular sending stays zip-free (individual files + folder enumeration only); zipping is a Prompt Mode concern.

## 5. Data & storage
- Buffer lives in **IndexedDB** (handles larger blobs than localStorage; note artifacts/this-env caveats don't apply to the real deployed app).
- Nothing server-side unless I explicitly push the buffer.
- "Clear buffer" wipes IndexedDB for the workspace.

## 6. Edge cases
- Huge repo → warn before reading thousands of files; offer to apply excludes first.
- Binary files → detect, exclude from text blob, optionally still transferable.
- Duplicate filenames in different folders → keyed by full relative path, so they don't collide.
- Very large single file → offer truncate/skip in the blob with a marker.
- Refresh mid-work → buffer restored from IndexedDB.

## 7. Why this is buildable
- Almost entirely **client-side**: file reading, tree, replace logic, formatting, clipboard — no Worker work beyond the optional push.
- No new infra. Builds on Phase 2's folder-reading code (`webkitdirectory`/JSZip).
- The hard parts are UX polish (tree, replace prompts, format toggles), not architecture.
