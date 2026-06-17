# errors log

## 2026-06-17 — deployed worker returns 500 internal server error

**symptom**
- https://relaypad.peers.workers.dev/ returned `internal server error`
- request reached the worker (not a dns/routing miss)
- same failure in local `npm run preview` / `wrangler dev`

**error (from wrangler debug logs)**
```
ChunkLoadError: Failed to load chunk server/chunks/ssr/[root-of-the-server]__*.js
  from runtime for chunk server/app/page.js
[cause]: Not found server/chunks/ssr/[root-of-the-server]__*.js
```

**cause**
- next.js 16 defaults to **turbopack** for `next build`
- opennext on cloudflare workers expects a **webpack** production build
- turbopack output uses chunk paths/runtime that fail inside the worker bundle

**fix**
- pin production builds to webpack in `package.json`:
  ```json
  "build": "next build --webpack"
  ```
- redeploy: `npm run deploy`
- keep `npm run dev` on turbopack for fast local iteration (unchanged)

**notes**
- opennext warns that windows builds can be flaky; wsl is recommended if preview/deploy misbehaves again
- wrangler config is `wrangler.jsonc` (not `.toml`); `nodejs_compat` is set there
