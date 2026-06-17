# 03 — Tech Stack & Deployment

## 1. Stack (deliberately boring)

| Layer | Choice | Why |
|---|---|---|
| Hosting / compute | **Cloudflare Workers** (free) | One origin for UI + API, no egress fees, no cold-start pain, generous free tier. |
| Object storage | **Cloudflare R2** (free 10GB) | Holds file payloads; no egress cost; large objects + multipart upload for chunking. |
| State / metadata | **Cloudflare KV** (free) | Pairing state, payload metadata, history index, TTL. |
| Real-time (Phase 2) | **Durable Objects** | Optional WebSocket presence/push. Not in MVP. |
| Frontend | **Next.js + TypeScript + Tailwind CSS** | Real structure, type safety, clean component-based UI. Tailwind for fast, consistent styling. Worth the build step for readability/maintainability vs. vanilla. |
| Deploy adapter | **OpenNext (`@opennextjs/cloudflare`)** | Adapts the Next.js build to run on Cloudflare Workers. GA (1.0) since Feb 2026, stable. Uses the Node.js runtime (not Edge). |
| Build / deploy CLI | **Wrangler** (CF CLI) | Cloudflare's CLI — builds/deploys the Worker output and binds R2/KV. *Not* a separate platform from Workers; it's the tool you deploy the Worker with (see note below). |
| Client libs (Phase 2) | `JSZip` (folder zip in Prompt Mode), Web Crypto API (encryption — built in, no lib) | Both run in-browser, keeping the Worker dumb. |

> **"Wrangler vs Cloudflare Worker" — same stack, not a choice.** The Cloudflare **Worker** is the serverless backend that *runs*. **Wrangler** is the CLI tool you use to *build and deploy* it (like `npm`/`vercel` are tools, not the app). With Next.js, the flow is: write Next.js app → OpenNext adapter converts the build into Worker-compatible output → Wrangler deploys that to Cloudflare Workers. Three names, one pipeline.

> **Frontend framework note:** Next.js adds a real build step and more setup than vanilla, so tonight's timeline is a little tighter — but the MVP is small enough that it's fine, and the structure/type-safety/readability win is worth it. Use the **App Router** + the **Node.js runtime** (required by OpenNext; Edge runtime is more constrained). API routes (route handlers) replace the hand-written Worker endpoints; OpenNext compiles them into the Worker.

## 2. Cloudflare bindings (wrangler config sketch)

```toml
# wrangler.toml  (illustrative — verify against current OpenNext + Wrangler docs at deploy time)
name = "relaypad"
main = ".open-next/worker.js"          # OpenNext build output
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"] # REQUIRED for Next.js on Workers via OpenNext

# OpenNext emits static assets here
[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[kv_namespaces]]
binding = "KV"
id = "<filled-by-wrangler>"

[[r2_buckets]]
binding = "R2"
bucket_name = "relaypad-payloads"
```

Plus an `open-next.config.ts` at the project root:
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

And `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

## 3. Free-tier limits to respect (verified June 2026)

- Workers: **100k requests/day**, **10ms CPU/request**, **128MB memory**, **3MB Worker code size**.
- Request body: **100MB** (Free plan). **MVP decision: enforce a hard 100MB cap per upload** and reject anything larger with a clear message. *No chunking in Phase 1* — it's deferred to Phase 2. Simpler to ship, and a single file/zip under 100MB covers nearly all real use.
- Response body: no hard limit (CDN cache 512MB) → stream large downloads.
- R2: **10GB storage, 1M ops/month**.
- KV: **1GB, ~100k reads+writes/day**.

**Operational guardrails:**
- Poll on a timer only while a tab is focused; back off when idle → keeps daily request count low.
- TTL everything in R2 and KV so storage never creeps toward caps.
- Prefer KV reads over writes during polling (don't write state on every poll).

## 4. Deployment (tonight)

1. `npm create cloudflare@latest -- relaypad --framework=next` (C3 scaffolds a Next.js app pre-wired for OpenNext + Workers). Choose TypeScript; add Tailwind.
2. Create R2 bucket + KV namespace (`wrangler r2 bucket create relaypad-payloads`, `wrangler kv namespace create KV`); add the bindings to `wrangler.toml`.
3. Build the UI (`src/app/page.tsx`) + API route handlers (`src/app/api/...`).
4. `npm run deploy` (runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`) → get `https://relaypad.<account>.workers.dev`.
5. Open on both PCs, test pairing + text + a small file **on the work network**.

> A free `*.workers.dev` subdomain is fine. No custom domain needed. If `workers.dev` ever turns out to be blocked at work, a custom domain on Cloudflare's free DNS is the fallback (cheap domain, not free, so only if forced).

> **Windows note:** OpenNext + Wrangler are more reliable under WSL (Linux). If `preview`/`deploy` misbehaves on native Windows, run it from WSL rather than debugging Windows-specific runtime issues.

## 5. Repo layout

```
relaypad/
├─ wrangler.toml
├─ open-next.config.ts
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ src/
│  ├─ app/
│  │  ├─ page.tsx              # main UI (Transfer Mode; Prompt Mode later)
│  │  ├─ layout.tsx
│  │  └─ api/                  # route handlers → compiled into the Worker by OpenNext
│  │     ├─ pair/route.ts
│  │     ├─ pair/[token]/claim/route.ts
│  │     └─ [token]/items/...  # send / poll / download
│  ├─ components/              # React components (drop zone, item list, status, etc.)
│  └─ lib/                     # client helpers: polling, upload, clipboard, types
├─ public/
└─ specs/                      # these markdown files
```

> The API "endpoints" from `04`/`05` are implemented as **Next.js route handlers** under `src/app/api/`. OpenNext bundles them into the single Worker, so there's still one origin serving UI + API.

## 6. Local dev

- `npm run dev` (plain `next dev`) for fast UI iteration.
- `npm run preview` (OpenNext build + local Workers runtime) to test the deployed-shape behavior + R2/KV bindings locally.
- But **the only test that counts is the deployed URL on the work PC.** Localhost cannot reproduce the corporate-network variable that is the whole risk.
