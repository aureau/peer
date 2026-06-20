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

## 2026-06-20 — receiver never sees the first item sent

**symptom**
- default receiver (joiner) doesn't see the initiator's first message
- it only appears once a second item is sent

**cause**
- `seq` is 0-based (`appendItem` starts at 0)
- receiver filter is exclusive: `seq > receiveSinceSeq`
- `receiveSinceSeq` defaulted to `0` on claim, so `seq > 0` skips the first item (`seq 0`)
- classic off-by-one: a count-style default (0) mixed with an index-style comparison on 0-based seq

**fix**
- default the floor to `-1`, matching the existing "nothing seen yet" cursor sentinel (`since=-1` => all)
  - `createPair` / `claimPair`: `receiveSinceSeq = -1`
  - `flipSender`: seed `maxSeqInIndex` reduce with `-1` (empty index => -1)
  - `Workspace` fallback `receiveSinceSeq ?? -1`
- updated specs/13 (§2/§4/§5) + specs/12 wording to `-1`
- verified: fresh receiver polling `since=-1` now returns `seq 0`

**notes**
- only the empty/fresh case changed; flips with existing items still floor at the last real seq
- watch for falsy checks — `receiveSinceSeq` can now be negative (use `??`, not `||`)

## 2026-06-20 — paired workspace status dot stuck green on connection loss

**symptom**
- in the paired workspace the status dot stayed green even when polling failed
- red `lost` state only worked on the waiting screen, never in the workspace

**cause**
- `Workspace` hardcoded `<ConnectionStatus state="paired" />` instead of using the live poll `state`

**fix**
- drive the dot from the poll: `state === "lost" ? "lost" : "paired"`
- recovers to green automatically on the next good poll

**notes**
- throttling one peer can't expire the other: every paired status poll rolls the 600s ttl (`touchSession`), so one live poller keeps the session alive (verified)
- background tab stops polling by design (page visibility pause); both peers silent for 10 min is the only thing that expires a paired session
