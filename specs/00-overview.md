# 00 — Project Overview

> **Working name:** `relaypad` (placeholder — rename freely)
> **One-liner:** A self-hosted, free, copypaste.me-style web app for moving text, files, and (later) whole repos between two computers I can't link with accounts/Cursor/sync tools.

---

## 1. The actual problem

At an internship, the work PC is locked down:

- No personal accounts, no Cursor, no Git push/pull to personal repos, no sync clients.
- The only reliable cross-machine channel is the browser.
- Today the workaround is `copypaste.me` — works, but it's someone else's service, has no history, no repo/folder ergonomics, and nothing tuned to my workflow.

The thing that hurts most day-to-day is **re-feeding an updated repo into a chat for context**: download → rename → re-upload → paste, over and over. That pain is what eventually becomes **Prompt Mode** (see `08`).

## 2. What we're building (in one breath)

A **Next.js (TypeScript + Tailwind)** web app, deployed onto a Cloudflare Worker (via the OpenNext adapter), where:

1. PC A opens the site and starts a session using my **fixed personal key** (a random short token is also available).
2. PC B opens the site, enters the same key → the two are paired (session expires in 3 min if no one joins).
3. PC A sends text / files / a folder; PC B receives and can copy/download. **Default:** initiator (`/`) sends, joiner (`/connect`) receives. Either side can take over send via **send from here** on the receiver workspace (see `13`).
4. Everything transient by default; ending a session wipes all data and resets both devices to the start state.

This is the **MVP**. Chunked >100MB uploads, images, history, encryption, and Prompt Mode layer on top in later phases.

## 3. Hard constraints (these drove every decision)

| Constraint | Implication |
|---|---|
| Must be **free** | Cloudflare Workers free tier + R2 free tier + KV free tier. No paid services. |
| Must work on a **locked-down corporate network** | Everything rides plain HTTPS to one origin I control. **No WebRTC P2P in MVP** (NAT/TURN risk). No exotic ports. |
| Must ship **tonight** | Minimize moving parts. One Worker serves UI + API + storage glue, no separate signaling server. Next.js adds a build step, but C3 scaffolds it pre-wired and the MVP is small. |
| Don't care about domain name | Use the free `*.workers.dev` subdomain. |
| Browser on work PC can browse + paste + download freely | Confirmed — so an HTTPS relay is sufficient; no need to defeat download restrictions. |

## 4. Why NOT the alternatives (short version — full detail in `02` & `09`)

- **GitHub Pages alone:** static only — no server to broker the connection or hold a file between A and B. Fatally insufficient on its own. (Detail in `02`.)
- **WebRTC P2P:** great privacy + no size cap, but corporate NAT often blocks the direct peer path and free/reliable TURN fallback is hard to get tonight. Kept as a **documented Phase-future upgrade** in `09`, not the MVP.
- **Render / Vercel backend:** viable, but Cloudflare Worker is *less code* (one origin serves UI+API, R2 has no egress fees) and lower firewall risk. Comparison in `02`.

## 5. Phase map

| Phase | Scope | File |
|---|---|---|
| **1 — MVP (tonight)** | Fixed-key pairing (3-min session), text + multi-file + folder send/receive, drag & drop, copy/download, 100MB cap, end-session clears all | `04`, `05` |
| **2 — Ergonomics** | Chunked upload (>100MB), images, opt-in history (TTL), client-side encryption | `06`, `07` |
| **3 — The dream** | **Prompt Mode** — in-app persistent context buffer, replace-by-name, zip→send→unzip, one-click formatted copy for chat context | `08` |
| **Upgrade path** | WebRTC P2P for big/private transfers | `09` |

## 6. Explicitly OUT of scope (rejected, on purpose)

- **Automatic background folder sync** (silently writing updated files into a folder on the other PC). Rejected: impossible from a web app alone — needs a local file-watcher agent installed on the personal PC, which can't run on the work PC anyway. The *real* underlying need (keeping repo context fresh in a chat) is solved by **Prompt Mode** instead. Do not let this creep back in.

## 7. File index

- `00-overview.md` — this file
- `01-goals-and-scope.md` — goals, non-goals, success criteria, personas
- `02-architecture.md` — chosen architecture + alternatives compared, platform limits
- `03-tech-stack.md` — concrete stack, free-tier limits, deployment
- `04-mvp-spec.md` — exact MVP feature spec
- `05-data-flow.md` — pairing + transfer data flow, sequence diagrams
- `06-features-roadmap.md` — Phase 2/3 features in detail
- `07-encryption.md` — encryption approaches, tradeoffs, injection/abuse surface
- `08-prompt-mode.md` — the dream feature, full spec
- `09-webrtc-alternative.md` — P2P upgrade path + tradeoffs
- `10-ui-ux.md` — screens, states, interactions
- `11-edge-cases.md` — failure modes, limits, abuse, recovery
- `12-mvp-build-checklist.md` — tonight's ordered task list
- `13-role-based-workspace.md` — role-based send/receive workspaces, flip API, migration from shared workspace
