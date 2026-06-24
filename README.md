# relaypad

A self-hosted, copypaste.me-style web app for moving text and files between two computers over HTTPS. Built with Next.js, deployed to Cloudflare Workers via OpenNext.

**Production URL:** https://relaypad.peers.workers.dev

| Route | Role |
|---|---|
| `/` | Initiator — start a session and send |
| `/connect` | Joiner — enter the key and receive |

---

## Prerequisites

Install these before cloning:

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | **20.x or newer** (LTS recommended) | `node --version` |
| npm | comes with Node | `npm --version` |
| [Git](https://git-scm.com/) | any recent | `git --version` |

Optional but recommended for deploy/preview on Windows:

- [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) (Ubuntu) — OpenNext is flaky on native Windows; use WSL for `npm run deploy` and `npm run preview` if you hit build/runtime errors.

---

## 1. Clone and install

```bash
git clone https://github.com/aureau/peer.git
cd peer
npm install
```

---

## 2. Cloudflare login

Local dev talks to real Cloudflare KV/R2 bindings (preview namespace) through Wrangler. Log in once per machine:

```bash
npx wrangler login
```

Use the same Cloudflare account that owns the `relaypad` worker. Verify:

```bash
npx wrangler whoami
```

You should see the account that has the `relaypad` worker. The KV/R2 bindings are already wired in `wrangler.jsonc` — you do **not** need to create new namespaces or buckets on a fresh clone.

---

## 3. Secrets and local config

Create your local secrets file from the example:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:

```bash
NEXTJS_ENV=development
ACCESS_TOKEN=your-long-high-entropy-secret-here
```

### `ACCESS_TOKEN` (required)

This is the **fixed personal pairing key** — both computers must use the **same value** to pair.

- **Local dev:** set in `.dev.vars` (gitignored — never commit it).
- **Production:** set via `npx wrangler secret put ACCESS_TOKEN` (already configured on the deployed worker).

On a new machine, copy the token from your existing `.dev.vars` or password manager. Wrangler cannot read secrets back after they are stored.

Use a long random string (e.g. 32+ characters). Example generation:

```bash
# macOS / Linux
openssl rand -hex 24

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 4. Run locally (day-to-day development)

```bash
npm run dev
```

Open http://localhost:3000 (initiator) or http://localhost:3000/connect (joiner).

- Uses **Turbopack** for fast reload.
- Loads secrets from `.dev.vars`.
- API routes use Cloudflare KV/R2 via `initOpenNextCloudflareForDev()` in `next.config.ts` — pairing, file upload, and polling all work against the **preview** KV namespace (separate daily quota from production).

If port 3000 is busy, Next.js picks the next free port and prints it in the terminal.

### Pairing on one machine (smoke test)

1. Open http://localhost:3000 → **start session**
2. Open http://localhost:3000/connect in another tab or browser profile → enter the same `ACCESS_TOKEN`
3. Send a text message or small file

### Pairing two physical computers

`localhost` on each machine is isolated. To pair across devices, either:

- Use production: https://relaypad.peers.workers.dev on both machines, or
- Run `npm run preview` (see below) and share the preview URL, or
- Tunnel local dev (e.g. Cloudflare Tunnel) — not set up by default.

---

## 5. Preview (local Cloudflare runtime)

Runs the full OpenNext production build inside the Workers runtime locally. Slower than `dev`, but closest to what ships:

```bash
npm run preview
```

Requires a successful build first. On Windows, prefer WSL if preview fails with permission or workerd errors.

**Tip:** only run one of `dev`, `preview`, or `deploy` at a time on Windows — stale processes can lock `.open-next/` and cause `EPERM` errors.

---

## 6. Deploy to production

```bash
npm run deploy
```

This runs `next build --webpack` (webpack is required — Turbopack output breaks inside the Worker bundle) then uploads to Cloudflare.

After deploy, confirm:

```bash
npx wrangler deployments list --name relaypad
```

### First-time deploy on a new machine

If you need to set or rotate the production secret:

```bash
npx wrangler secret put ACCESS_TOKEN
```

---

## 7. Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production Next.js build (webpack) |
| `npm run preview` | Build + run on local Workers runtime |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run lint` | ESLint |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` after binding changes |
| `npx wrangler tail relaypad` | Stream production logs |
| `npx wrangler deployments list` | Recent deploy history |

---

## 8. Project layout (quick reference)

```
src/app/              Next.js App Router pages and API routes
src/app/api/pair/     Start / claim session
src/app/api/[key]/    Status, items, sender, end (key = ACCESS_TOKEN)
src/components/       UI (pairing, workspace)
src/lib/storage/      KV/R2 session and file logic
src/lib/pairing/      Client polling and API helpers
specs/                Feature specs and architecture notes
wrangler.jsonc        Cloudflare bindings (KV, R2, cron)
worker.ts             Worker entry (OpenNext + R2 orphan sweep cron)
.dev.vars             Local secrets (create from .dev.vars.example)
```

---

## 9. Troubleshooting

### `ACCESS_TOKEN is not configured` / 500 on start session

- `.dev.vars` is missing or `ACCESS_TOKEN` is empty.
- Restart `npm run dev` after creating or editing `.dev.vars`.

### `KV put() limit exceeded for the day`

Cloudflare free tier allows ~1,000 KV writes/day. Production hit this when status polling wrote on every poll. The throttle fix (60s between TTL rolls) must be **deployed** — committing locally is not enough. Quota resets at UTC midnight. Local `npm run dev` uses a separate preview namespace.

### Deploy fails with `EPERM` on `.open-next`

Kill stale Node/workerd processes, delete `.open-next`, retry:

```powershell
# PowerShell (Windows)
Get-CimInstance Win32_Process -Filter "name='node.exe' OR name='workerd.exe'" |
  Where-Object { $_.CommandLine -match 'peer' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item -Recurse -Force .open-next -ErrorAction SilentlyContinue
npm run deploy
```

```bash
# WSL / macOS / Linux
pkill -f "peer.*(next|wrangler|opennext|workerd)" 2>/dev/null || true
rm -rf .open-next
npm run deploy
```

### Production 500 / `ChunkLoadError` in logs

Production builds must use webpack, not Turbopack. `package.json` already has `"build": "next build --webpack"`. Redeploy.

### `FixedLengthStream is not defined` in local dev

Known Node dev limitation for large streaming uploads. Production Workers runtime handles it correctly.

---

## 10. Further reading

- [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare)
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/)
- `specs/00-overview.md` — project goals and phase map
- `specs/03-tech-stack.md` — stack, limits, deployment notes
- `errors-log.md` — past incidents and fixes
