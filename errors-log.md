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

## 2026-06-17 — opennext build EPERM on `.open-next`

**symptom**
- `npm run deploy` fails with `EPERM, Permission denied` when deleting `.open-next`

**cause**
- stale `next dev`, `npm run preview`, or `wrangler dev` processes hold a lock on `.open-next/assets`

**fix**
- kill stale project processes, delete `.open-next`, redeploy
- only run one of dev/preview/deploy at a time on windows

**powershell (windows)**
```powershell
Get-CimInstance Win32_Process -Filter "name='node.exe' OR name='workerd.exe'" |
  Where-Object { $_.CommandLine -match 'programs\\peer' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Remove-Item -Recurse -Force .open-next -ErrorAction SilentlyContinue
npm run deploy
```

**wsl ubuntu (preferred for opennext)**
```bash
cd /mnt/c/Users/skinn/OneDrive/Documents/programs/peer
pkill -f "programs/peer.*(next|wrangler|opennext|workerd)" 2>/dev/null || true
sleep 2
rm -rf .open-next
npm run deploy
```
