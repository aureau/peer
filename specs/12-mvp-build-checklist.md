# 12 — MVP Build Checklist (Tonight)

Ordered so each step produces something testable. Stop-and-test on the **work network** as early as possible.

## 0. Prereqs (15 min)
- [ ] Cloudflare account (free).
- [ ] Node.js installed; `npm i -g wrangler` (or use `npx wrangler`).
- [ ] `wrangler login`.
- [ ] (Windows) consider running the OpenNext build/deploy from **WSL** — it's more reliable than native Windows.

## 1. Scaffold Next.js-on-Workers + deploy a "hello" (get the pipe proven first) (25 min)
- [ ] `npm create cloudflare@latest -- relaypad --framework=next` → choose **TypeScript**; add **Tailwind**.
  - This pre-wires the **OpenNext** adapter (`@opennextjs/cloudflare`), `open-next.config.ts`, and `wrangler.toml` with `nodejs_compat`.
- [ ] Confirm a trivial `src/app/page.tsx` renders "it works".
- [ ] `npm run deploy` → note the `*.workers.dev` URL.
- [ ] **CRITICAL TEST:** open that URL on the **work PC**. If it loads → green light. If blocked → resolve the domain issue (custom domain fallback) before writing more.

## 2. Storage bindings (15 min)
- [ ] `wrangler kv namespace create KV` → add the binding to `wrangler.toml`.
- [ ] `wrangler r2 bucket create relaypad-payloads` → add the binding.
- [ ] Redeploy; confirm a route handler can read/write a test KV key (env bindings available at runtime).

## 3. Pairing with fixed personal key (45 min)
- [ ] Decide the fixed key (long, high-entropy) — store as a config/env value the app checks.
- [ ] `POST /api/pair` → start session keyed by the fixed key (status `waiting`, **3-min** unclaimed TTL). (Also support a random-token variant as an alternative.)
- [ ] `POST /api/pair/{key}/claim` → mark `paired` (single active pairing guard).
- [ ] `GET /api/{key}/status` → return `{ status, expiresIn }`.
- [ ] UI: "Start session" + **3-min countdown**; other device enters the key + "Connect"; both poll status.
- [ ] **TEST:** pair work PC ↔ personal PC. Both show "Paired."

## 4. Text transfer (30 min)
- [ ] `POST /api/{key}/items` (text).
- [ ] `GET /api/{key}/items?since=cursor` (poll).
- [ ] UI: textarea + send; received list + Copy (render via `textContent`, never `innerHTML`).
- [ ] **TEST:** send a multi-line block across; paste verifies intact.

## 5. File transfer + folder send (50 min)
- [ ] `POST /api/{key}/items` streams file → R2; metadata → KV. **Enforce the 100MB hard cap**; reject larger with a clear error.
- [ ] `GET /api/{key}/items/{id}/download` streams from R2 with `Content-Disposition: attachment`.
- [ ] UI: drop zone + file picker + **folder picker (`webkitdirectory`)**; folder send enumerates files with relative paths as items; received rows + Download; per-file progress.
- [ ] **TEST:** send a <10MB file and a small folder; download; confirm byte-identical (`shasum` both ends) and folder structure preserved in metadata.

## 6. Session end + safety minimums (30 min)
- [ ] `POST /api/{key}/end` → delete all KV + R2 for the session; both devices reset to **Unpaired** start state.
- [ ] Same wipe on 3-min unclaimed timeout / inactivity TTL / disconnect.
- [ ] Status states (unpaired / waiting+countdown / paired / lost) visible.
- [ ] Basic per-session item cap; pause/slow polling when tab hidden (Page Visibility API).

## Definition of done (tonight)
> On the **work network**, I can pair both PCs with my fixed key, send a paragraph of text, a small file, and a small folder, and receive them intact on the other side over the deployed URL. Ending the session wipes everything and resets to start. Everything else is roadmap.

## NOT tonight (explicitly deferred)
- Chunked upload for files >100MB → **Phase 2**.
- Images preview / paste → Phase 2.
- Client-side encryption → Phase 2 (before any history).
- History → Phase 2, opt-in.
- Cron sweep for orphaned R2 → Phase 2 nicety (session-end wipe covers the common case).

## Right-after-tonight queue
1. Chunked large-file upload (R2 multipart) → repos beyond 100MB.
2. Folder-upload polish (excludes: `node_modules`/`.git`, per-file toggles).
3. Image paste + preview.
4. Client-side encryption (`07`) before any history.
5. Then: **Prompt Mode** (`08`) — the actual dream (incl. zip → send → unzip → read in-app).
