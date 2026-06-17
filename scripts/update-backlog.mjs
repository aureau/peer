import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// number -> node_id
const ID = {
  1: "I_kwDOS89O788AAAABFv1AvA", 3: "I_kwDOS89O788AAAABFv1CJg", 4: "I_kwDOS89O788AAAABFv1Cyg",
  5: "I_kwDOS89O788AAAABFv1DpQ", 7: "I_kwDOS89O788AAAABFv1E_Q", 8: "I_kwDOS89O788AAAABFv1FnQ",
  10: "I_kwDOS89O788AAAABFv1G5w", 25: "I_kwDOS89O788AAAABFv1SkA", 28: "I_kwDOS89O788AAAABFv1VOQ",
  36: "I_kwDOS89O788AAAABFv1cHQ", 39: "I_kwDOS89O788AAAABFv1fDA", 48: "I_kwDOS89O788AAAABFv1mNQ",
  59: "I_kwDOS89O788AAAABFv1vmQ", 60: "I_kwDOS89O788AAAABFv1wnw", 61: "I_kwDOS89O788AAAABFv1xtw",
};

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function gqlInput(obj) {
  const tmp = join(tmpdir(), `gql-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(tmp, JSON.stringify(obj), "utf8");
  try {
    const out = sh(`gh api graphql --input ${JSON.stringify(tmp)}`);
    const j = JSON.parse(out);
    if (j.errors?.length) throw new Error(JSON.stringify(j.errors));
    return j.data;
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

function edit(num, { title, body, add = [], remove = [] }) {
  const parts = [`gh issue edit ${num}`];
  if (title) parts.push(`--title ${JSON.stringify(title)}`);
  let tmp;
  if (body) {
    tmp = join(tmpdir(), `body-${num}.md`);
    writeFileSync(tmp, body, "utf8");
    parts.push(`--body-file ${JSON.stringify(tmp)}`);
  }
  for (const l of add) parts.push(`--add-label ${JSON.stringify(l)}`);
  for (const l of remove) parts.push(`--remove-label ${JSON.stringify(l)}`);
  try {
    sh(parts.join(" "));
  } finally {
    if (tmp) try { unlinkSync(tmp); } catch {}
  }
  process.stdout.write(".");
}

function reparent(childNum, parentNum) {
  gqlInput({
    query: "mutation($p:ID!,$c:ID!){addSubIssue(input:{issueId:$p,subIssueId:$c,replaceParent:true}){issue{number}}}",
    variables: { p: ID[parentNum], c: ID[childNum] },
  });
}

function addBlock(blockedNum, blockerNum) {
  gqlInput({
    query: "mutation($b:ID!,$k:ID!){addBlockedBy(input:{issueId:$b,blockingIssueId:$k}){issue{number}}}",
    variables: { b: ID[blockedNum], k: ID[blockerNum] },
  });
}

function rmBlock(blockedNum, blockerNum) {
  try {
    gqlInput({
      query: "mutation($b:ID!,$k:ID!){removeBlockedBy(input:{issueId:$b,blockingIssueId:$k}){issue{number}}}",
      variables: { b: ID[blockedNum], k: ID[blockerNum] },
    });
  } catch (e) { /* ignore if not present */ }
}

const AC = (lines) => "## Acceptance criteria\n" + lines.map((l) => `- [ ] ${l}`).join("\n");
const refs = (arr) => "\n\n## Spec refs\n" + arr.map((r) => `- specs/${r}`).join("\n");
const blocked = (nums) => (nums.length ? `\n\n**blocked-by:** ${nums.map((n) => `#${n}`).join(", ")}` : "");
const goal = (g, specs, phase) => `## Goal\n${g}\n\n## Spec coverage\n${specs.map((s) => `- specs/${s}`).join("\n")}\n\n## Phase\n${phase}`;

console.log("Editing epics...");
edit(1, { body: goal("Scaffold a Next.js (TypeScript + Tailwind) app deployed to Cloudflare Workers via the OpenNext adapter, and pass the work-network smoke test.", ["03-tech-stack.md", "02-architecture.md", "12-mvp-build-checklist.md"], "mvp") });
edit(5, { body: goal("Next.js + TypeScript + Tailwind UI for fixed-key pairing (3-min countdown), the send/receive workspace (text, files, folder picker), copy/download, connection status, and end-session reset.", ["04-mvp-spec.md", "10-ui-ux.md", "05-data-flow.md", "12-mvp-build-checklist.md"], "mvp") });
edit(7, { body: goal("Phase 2: add R2 multipart chunked upload to exceed the MVP 100MB hard cap and gain resumability. Deferred out of MVP per the new specs.", ["04-mvp-spec.md", "05-data-flow.md", "06-features-roadmap.md", "11-edge-cases.md", "12-mvp-build-checklist.md"], "phase-2"), add: ["phase-2"], remove: ["phase-1.5"] });
edit(8, { body: goal("Phase 2 ergonomics: folder-send polish (excludes, per-file toggles, receiver-side reconstruction), image preview + clipboard paste, and opt-in TTL history. Note: basic folder enumeration ships in the MVP; client-side zip lives in Prompt Mode.", ["06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md", "11-edge-cases.md"], "phase-2") });
edit(10, { body: goal("Local-first in-browser context buffer with replace-by-name, formatted copy, and the zip -> send -> unzip -> read-in-app flow over the transfer channel.", ["08-prompt-mode.md", "06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md"], "phase-3") });

console.log("\nEpic 1 children...");
edit(12, {
  title: "Scaffold Next.js-on-Workers project (OpenNext, TypeScript, Tailwind)",
  body: AC([
    "Scaffold via `npm create cloudflare@latest -- relaypad --framework=next` (choose TypeScript; add Tailwind)",
    "OpenNext wired: `open-next.config.ts`, `wrangler.toml` with `compatibility_flags = [\"nodejs_compat\"]`",
    "`package.json` scripts: dev (`next dev`), preview, deploy (`opennextjs-cloudflare build && ... deploy`)",
    "Repo layout matches specs/03-tech-stack.md section 5 (App Router, src/app, src/lib, src/components)",
    "`npm run dev` runs locally without errors",
  ]) + refs(["03-tech-stack.md", "12-mvp-build-checklist.md"]) + blocked([]),
});
edit(13, {
  title: "Render hello page (src/app/page.tsx) and deploy via OpenNext",
  body: AC([
    "`src/app/page.tsx` renders a visible \"it works\" message",
    "OpenNext static assets binding configured (`.open-next/assets`, ASSETS)",
    "`npm run deploy` succeeds and returns the `*.workers.dev` URL",
  ]) + refs(["03-tech-stack.md", "12-mvp-build-checklist.md"]) + blocked([12]),
});
edit(14, {
  title: "Verify deployment loads on work network",
  body: AC([
    "Deployed `*.workers.dev` URL opens on the work PC browser",
    "If blocked, document custom-domain fallback (specs/11-edge-cases.md)",
    "(Windows) note: run OpenNext build/deploy from WSL if native Windows misbehaves",
    "Smoke test recorded before further feature work",
  ]) + refs(["12-mvp-build-checklist.md", "11-edge-cases.md", "03-tech-stack.md"]) + blocked([13]),
});

console.log("\nEpic 2 children...");
edit(15, {
  title: "Create KV namespace and R2 bucket bindings",
  body: AC([
    "`wrangler kv namespace create KV` and `wrangler r2 bucket create relaypad-payloads`",
    "Bindings added to `wrangler.toml` (KV, R2)",
    "A Next.js route handler can read/write a test KV key via runtime bindings (getCloudflareContext / env)",
  ]) + refs(["03-tech-stack.md", "12-mvp-build-checklist.md"]) + blocked([13]),
});
edit(16, {
  title: "Implement KV and R2 key schema helpers",
  body: AC([
    "Helpers in `src/lib` used by route handlers",
    "`pair:{key}` stores status, created, lastActive (key = fixed personal key or random token)",
    "`items:{key}` stores ordered item index with seq, type, metadata, r2key",
    "R2 keys use server-generated ids, not raw filenames; small text inline in KV, large text spills to R2",
  ]) + refs(["05-data-flow.md", "02-architecture.md"]) + blocked([15]),
});
edit(17, {
  title: "Implement session TTL (3-min unclaimed, rolling paired)",
  body: AC([
    "Unclaimed sessions expire after 3 minutes (KV TTL)",
    "`expiresIn` is computable from session state to drive the UI countdown",
    "Paired sessions roll TTL on activity (~30-60 min inactivity)",
    "Expired sessions reject further API use with a clear error",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md"]) + blocked([16]),
});
edit(18, {
  title: "Add POST /api/{key}/end to wipe session and reset both devices",
  body: AC([
    "`POST /api/{key}/end` deletes all KV metadata + all R2 objects for the session",
    "Same full wipe also triggered by 3-min unclaimed timeout, inactivity TTL, or disconnect",
    "Both devices reset their UI to the Unpaired (start) state; no residue, no history (MVP)",
    "Starting a fresh session with the same fixed key supersedes/clears any prior session",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md"]) + blocked([16]),
});
edit(19, {
  title: "Add Cron Trigger to sweep orphaned R2 objects",
  body: AC([
    "Scheduled Cron Trigger configured in `wrangler.toml`",
    "Sweep deletes R2 objects whose KV metadata has expired",
    "Phase 2 nicety: the MVP session-end wipe (#18) already covers the common case",
  ]) + refs(["05-data-flow.md", "11-edge-cases.md", "12-mvp-build-checklist.md"]) + blocked([17]),
  add: ["phase-2"], remove: ["mvp"],
});

console.log("\nEpic 3 children (pairing)...");
edit(3, { body: goal("Start a session via fixed personal key (default) or random token (alternative), single active-pairing claim, status polling with 3-min unclaimed countdown (expiresIn), and TTL rollover.", ["04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md", "12-mvp-build-checklist.md"], "mvp") });
edit(20, {
  title: "Add POST /api/pair to start a session (fixed key default, random token alt)",
  body: AC([
    "Default: start session keyed by the configured fixed personal key (config/env value)",
    "Alternative: mint a random 6-8 char unambiguous token (no 0/O, 1/l/I)",
    "KV stores session as `waiting` with a 3-min unclaimed TTL",
    "Returns `{ key }` (the fixed key or minted token); collisions remint in token mode",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md"]) + blocked([16]),
});
edit(21, {
  title: "Add POST /api/pair/{key}/claim with single active-pairing guard",
  body: AC([
    "Valid key/token transitions session waiting -> paired",
    "Reject a second concurrent claim (single active pairing) to prevent hijack",
    "Invalid / expired / typo keys return clear errors",
    "TTL switches to rolling inactivity on successful claim",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md"]) + blocked([20]),
});
edit(22, {
  title: "Add GET /api/{key}/status endpoint",
  body: AC([
    "Returns `{ status, expiresIn }` (status: unpaired|waiting|paired|expired)",
    "`expiresIn` drives the 3-min waiting countdown in the UI",
    "Both devices can poll status; lastActive updates roll TTL while paired",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md"]) + blocked([21]),
});

console.log("\nEpic 4 children (transfer API)...");
edit(4, { body: goal("Text + small-file + folder-aware send/receive over HTTPS (Next.js route handlers), with a 100MB hard cap, cursor-based polling, and streamed R2 download. `{key}` = fixed key or token.", ["04-mvp-spec.md", "05-data-flow.md", "12-mvp-build-checklist.md"], "mvp") });
edit(23, {
  title: "Add POST /api/{key}/items route handler for text payloads",
  body: AC([
    "Route handler accepts `{ type: text, content }` for paired sessions only",
    "Text stored verbatim (whitespace/newlines preserved)",
    "Returns `{ itemId, seq/cursor }`; rejects uploads to unpaired/expired sessions",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md"]) + blocked([21]),
});
edit(24, {
  title: "Add GET /api/{key}/items poll route handler with cursor",
  body: AC([
    "`GET /api/{key}/items?since=cursor` returns only newer items",
    "Monotonic seq per session; no duplicates",
    "Read-only poll (no KV writes per poll)",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md"]) + blocked([23]),
});
edit(25, {
  title: "Add POST /api/{key}/items file upload streaming to R2 (100MB cap)",
  body: AC([
    "Stream upload to R2 without buffering the whole file in the Worker",
    "Enforce a hard 100MB cap per upload; reject larger with a clear error (no chunking in MVP)",
    "Metadata `{ type:file, name, size, mime, itemId, relativePath? }` indexed in KV",
    "Accept optional `relativePath` so folder sends preserve structure; zero-byte files transfer faithfully",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md", "03-tech-stack.md"]) + blocked([23]),
});
edit(26, {
  title: "Add GET /api/{key}/items/{id}/download route handler",
  body: AC([
    "Streams the R2 object with `Content-Disposition: attachment`",
    "Safe `Content-Type` on download responses",
    "Downloaded file is byte-identical to upload",
  ]) + refs(["04-mvp-spec.md", "05-data-flow.md", "07-encryption.md"]) + blocked([25]),
});

console.log("\nEpic 5 children (UI)...");
edit(27, {
  title: "Build pairing UI for start-session and join flows",
  body: AC([
    "Initiator: \"Start session\" with a visible 3-min countdown; random token shown large + Copy only in token mode",
    "Joiner: enter the fixed personal key (or token) + Connect",
    "Both sides poll status until Paired",
    "Fixed personal key is the default join method",
  ]) + refs(["10-ui-ux.md", "04-mvp-spec.md", "12-mvp-build-checklist.md"]) + blocked([22]),
});
edit(54, {
  title: "Add initiator view (Start session + 3-min countdown)",
  body: AC([
    "\"Start session\" calls POST /api/pair",
    "Visible 3-minute countdown driven by `expiresIn`",
    "In random-token mode only: large monospace token + Copy button (Clipboard API)",
    "\"Waiting for other device\" status shown",
  ]) + blocked([22]),
});
edit(55, {
  title: "Add joiner view (enter fixed key or token)",
  body: AC([
    "Key/token input with unambiguous charset validation for token mode",
    "Connect calls POST /api/pair/{key}/claim",
    "Optional \"remember key on this device\" (local-only convenience)",
    "Clear errors for typo / expired / already-claimed",
  ]) + blocked([54]),
});
edit(56, {
  title: "Wire pairing views to status polling until Paired",
  body: AC([
    "Both views poll GET /api/{key}/status until paired",
    "Render `expiresIn` countdown while waiting",
    "Transition to paired workspace on success; handle expiry during wait (reset to start)",
  ]) + blocked([54, 55]),
});
edit(28, {
  title: "Build send workspace (textarea, drop zone, file + folder pickers, End session)",
  body: AC([
    "Textarea + Send button (Ctrl/Cmd+Enter shortcut)",
    "Drag-drop zone + `input type=file multiple` fallback",
    "Folder picker (`webkitdirectory`) for MVP folder send",
    "Show file count + total size before send; whole window is a drop target when paired",
    "\"End session\" button calls POST /api/{key}/end and returns to the start screen",
  ]) + refs(["10-ui-ux.md", "04-mvp-spec.md", "12-mvp-build-checklist.md"]) + blocked([23]),
});
edit(29, {
  title: "Build received items list with copy and download actions",
  body: AC([
    "Items render newest first via poll loop",
    "Text items: preview + Copy (Clipboard API)",
    "File items: name, size, relative path (for folder sends), Download button",
    "Subtle new-item pulse on arrival (respect prefers-reduced-motion)",
  ]) + refs(["04-mvp-spec.md", "10-ui-ux.md", "12-mvp-build-checklist.md"]) + blocked([24, 26]),
});
edit(30, {
  title: "Implement status bar, waiting countdown, and poll loop with Page Visibility",
  body: AC([
    "Status dot + label: grey=unpaired, amber=waiting (with countdown), green=paired, red=lost",
    "Poll ~2s when focused; backoff when blurred; pause when hidden (Page Visibility API)",
    "State machine: UNPAIRED -> WAITING(3-min) -> PAIRED -> EXPIRED",
    "Any terminal transition (timeout/expiry/end-session/disconnect) wipes data and resets to UNPAIRED",
  ]) + refs(["10-ui-ux.md", "05-data-flow.md", "12-mvp-build-checklist.md"]) + blocked([27]),
});

console.log("\nEpic 6 children (safety)...");
edit(31, {
  title: "Render user content safely in React (no dangerouslySetInnerHTML)",
  body: AC([
    "Render text/filenames as JSX text (React escapes by default); never use dangerouslySetInnerHTML",
    "Filenames and relative paths escaped on display",
    "No stored XSS via text, filename, or relativePath fields",
  ]) + refs(["07-encryption.md", "11-edge-cases.md", "12-mvp-build-checklist.md"]) + blocked([29]),
});
edit(32, {
  title: "Enforce per-session quotas and 100MB upload cap",
  body: AC([
    "Per-session item count and total byte quotas enforced with clear errors",
    "Hard 100MB cap per upload; reject larger files with a clear message (no chunking in MVP)",
    "Quotas + full session-end wipe keep storage near zero",
  ]) + refs(["07-encryption.md", "11-edge-cases.md", "04-mvp-spec.md"]) + blocked([25]),
});
edit(33, {
  title: "Rate-limit pairing claim attempts per IP",
  body: AC([
    "Claim endpoint rate-limited per IP (KV counter or CF rate limiting)",
    "Long high-entropy fixed key; 3-min unclaimed TTL; single active pairing",
    "Brute-force attempts throttled with sensible limits",
  ]) + refs(["07-encryption.md", "11-edge-cases.md"]) + blocked([21]),
});
edit(35, {
  title: "Sanitize filenames/paths and use server-generated R2 keys",
  body: AC([
    "R2 object keys derived from server itemId, not user filename",
    "Original filename + relativePath stored as metadata only",
    "Unsafe filename/path chars handled safely on display; no path traversal in storage keys",
  ]) + refs(["11-edge-cases.md", "07-encryption.md"]) + blocked([25]),
});

console.log("\nEpic 7 children (chunked -> phase-2)...");
edit(36, { add: ["phase-2"], remove: ["phase-1.5"] });
edit(37, { add: ["phase-2"], remove: ["phase-1.5"] });
edit(38, { add: ["phase-2"], remove: ["phase-1.5"] });

console.log("\nFolder + zip restructure...");
// #60 folder enumeration -> MVP under Epic 5 (#28)
reparent(60, 28);
edit(60, {
  title: "Enumerate folder files via webkitdirectory (MVP regular send)",
  body: AC([
    "`webkitdirectory` input / drag-a-folder enumerates all files with relative paths",
    "Send enumerated files as individual items, relativePath preserved as metadata (not zipped)",
    "Each file respects the 100MB cap; fallback to multi-file picker if webkitdirectory unsupported",
  ]) + refs(["04-mvp-spec.md", "06-features-roadmap.md", "11-edge-cases.md"]) + blocked([59]),
  add: ["mvp"], remove: ["phase-2"],
});
// #39 zip flow -> Prompt Mode (Epic 10), phase-3
reparent(39, 10);
edit(39, {
  title: "Add zip -> send -> unzip -> read-in-app flow in Prompt Mode (JSZip)",
  body: AC([
    "Prompt Mode zips a folder from the context buffer client-side (JSZip) into one .zip item",
    "Send over the normal transfer channel (subject to 100MB cap until chunking lands)",
    "Receiver unzips client-side and loads files straight into its context buffer (no download-to-disk)",
    "Replace-by-name applies so re-sending an updated repo updates matching files in place",
  ]) + refs(["08-prompt-mode.md", "06-features-roadmap.md"]) + blocked([48, 25]),
  add: ["phase-3"], remove: ["phase-2"],
});
// #61 zip enumerated folder -> Prompt Mode, child of #39, phase-3
reparent(61, 39);
edit(61, {
  title: "Zip context-buffer folder client-side with JSZip (Prompt Mode)",
  body: AC([
    "JSZip packages a buffer folder preserving relative paths into a single .zip",
    "Produced .zip is sent as one transfer item",
    "Foundation for the zip->send->unzip flow (#39)",
  ]) + blocked([39]),
  add: ["phase-3"], remove: ["phase-2"],
});
// #40 folder polish reword (stays Epic 8 / phase-2)
edit(40, {
  title: "Add folder-send polish (excludes, per-file toggles, receiver reconstruction)",
  body: AC([
    "Optional excludes (node_modules, .git, build dirs) for folder sends",
    "Per-file include/exclude toggles before sending",
    "Receiver-side folder reconstruction on download using relativePath metadata",
  ]) + refs(["06-features-roadmap.md"]) + blocked([60]),
});
// #59 minor: note folder picker sibling
edit(59, {
  title: "Add file picker fallback input",
  body: AC([
    "`input type=file multiple` as fallback to drag-drop",
    "Same upload path as drag-drop and folder picker",
    "Works when drag-drop unavailable",
  ]) + blocked([57]),
});
// #58 add 100MB reject message
edit(58, {
  title: "Add drag-drop file zone with whole-window target",
  body: AC([
    "Drop zone highlights on drag-over when paired",
    "Shows file count + total size before upload",
    "Reject files over 100MB with a clear inline message",
    "Uploads each file via the transfer API",
  ]) + blocked([57]),
});
// #51 push buffer reword
edit(51, {
  title: "Add optional push buffer to other PC via transfer channel",
  body: AC([
    "Push buffer zips the buffer (single .zip item) and sends via the transfer API",
    "Subject to the 100MB cap until chunked upload lands in Phase 2",
    "Receiver imports the buffer on the other device; reuses transfer plumbing",
  ]) + refs(["08-prompt-mode.md"]) + blocked([48, 25]),
});

console.log("\nFixing native dependencies for restructured issues...");
rmBlock(60, 36); // was blocked by chunked API
addBlock(60, 59);
rmBlock(39, 36);
addBlock(39, 48);
addBlock(39, 25);
rmBlock(61, 60);
addBlock(61, 39);
addBlock(40, 60);

console.log("\nDone updating backlog.");
