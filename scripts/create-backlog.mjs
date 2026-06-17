import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ID = "R_kgDOS89O7w";

function sh(cmd, input) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    input,
  }).trim();
}

function gql(query, vars = {}) {
  const payload = JSON.stringify({ query, variables: vars });
  const tmp = join(tmpdir(), `gql-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(tmp, payload, "utf8");
  try {
    const out = sh(`gh api graphql --input ${JSON.stringify(tmp)}`);
    const json = JSON.parse(out);
    if (json.errors?.length) {
      throw new Error(JSON.stringify(json.errors, null, 2));
    }
    return json.data;
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function createEpic({ title, goal, phase, specs }) {
  const body = [
    "## Goal",
    goal,
    "",
    "## Spec coverage",
    ...specs.map((s) => `- specs/${s}`),
    "",
    "## Phase",
    phase,
  ].join("\n");
  const data = gql(
    `mutation($repo:ID!, $title:String!, $body:String!) {
      createIssue(input: { repositoryId: $repo, title: $title, body: $body }) {
        issue { number id title }
      }
    }`,
    { repo: REPO_ID, title, body },
  );
  const issue = data.createIssue.issue;
  sh(`gh issue edit ${issue.number} --add-label epic,${phase}`);
  return { number: issue.number, id: issue.id, title: issue.title };
}

function createChild({ title, body, parentId, labels = ["mvp"] }) {
  const data = gql(
    `mutation($repo:ID!, $title:String!, $body:String!, $parent:ID!) {
      createIssue(input: { repositoryId: $repo, title: $title, body: $body, parentIssueId: $parent }) {
        issue { number id title }
      }
    }`,
    { repo: REPO_ID, title, body, parent: parentId },
  );
  const issue = data.createIssue.issue;
  if (labels.length) {
    sh(`gh issue edit ${issue.number} --add-label ${labels.join(",")}`);
  }
  return { number: issue.number, id: issue.id, title: issue.title };
}

function addBlockedBy(blockedId, blockerId) {
  gql(
    `mutation($blocked:ID!, $blocker:ID!) {
      addBlockedBy(input: { issueId: $blocked, blockingIssueId: $blocker }) { issue { number } }
    }`,
    { blocked: blockedId, blocker: blockerId },
  );
}

function setBlockedByNote(number, blockers) {
  if (!blockers.length) return;
  const existing = sh(`gh issue view ${number} --json body -q .body`);
  if (existing.includes("blocked-by:")) return;
  const note = blockers.map((n) => `#${n}`).join(", ");
  const updated = `${existing.trimEnd()}\n\n**blocked-by:** ${note}`;
  const tmp = join(tmpdir(), `issue-edit-${number}.md`);
  writeFileSync(tmp, updated, "utf8");
  try {
    sh(`gh issue edit ${number} --body-file ${JSON.stringify(tmp)}`);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function markReady(number) {
  sh(`gh issue edit ${number} --add-label ready`);
}

console.log("Creating epics...");
const e1 = createEpic({
  title: "Epic: Project Foundation & Deployment",
  goal: "Stand up a deployable Cloudflare Worker that serves static UI on *.workers.dev and passes the work-network smoke test.",
  phase: "mvp",
  specs: ["03-tech-stack.md", "02-architecture.md", "12-mvp-build-checklist.md"],
});
const e2 = createEpic({
  title: "Epic: Storage Bindings & Data Lifecycle",
  goal: "Wire KV + R2 with the token/item schema, TTL strategy, clear-session delete, and orphan sweep.",
  phase: "mvp",
  specs: ["02-architecture.md", "05-data-flow.md", "04-mvp-spec.md", "11-edge-cases.md", "12-mvp-build-checklist.md"],
});
const e3 = createEpic({
  title: "Epic: Pairing & Session API",
  goal: "Implement token mint, single-claim join, status polling, and session TTL rollover.",
  phase: "mvp",
  specs: ["04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md", "12-mvp-build-checklist.md"],
});
const e4 = createEpic({
  title: "Epic: Payload Transfer API",
  goal: "Ship text + small-file send/receive over HTTPS with cursor-based polling and streamed R2 download.",
  phase: "mvp",
  specs: ["04-mvp-spec.md", "05-data-flow.md", "12-mvp-build-checklist.md"],
});
const e5 = createEpic({
  title: "Epic: Transfer Mode UI",
  goal: "Vanilla HTML/JS/CSS for pairing, send/receive workspace, drag-drop, copy/download, and connection status.",
  phase: "mvp",
  specs: ["04-mvp-spec.md", "10-ui-ux.md", "05-data-flow.md", "12-mvp-build-checklist.md"],
});
const e6 = createEpic({
  title: "Epic: MVP Safety, Limits & Edge Cases",
  goal: "Harden the relay with XSS-safe rendering, quotas, rate limits, and resilient error/recovery paths.",
  phase: "mvp",
  specs: ["07-encryption.md", "11-edge-cases.md", "04-mvp-spec.md", "12-mvp-build-checklist.md"],
});
const e7 = createEpic({
  title: "Epic: Large-File Chunked Upload",
  goal: "R2 multipart chunked upload so repos/large files exceed the 100MB single-request ceiling reliably.",
  phase: "phase-1.5",
  specs: ["04-mvp-spec.md", "05-data-flow.md", "06-features-roadmap.md", "11-edge-cases.md", "12-mvp-build-checklist.md"],
});
const e8 = createEpic({
  title: "Epic: Phase 2 Ergonomics (Folders, Images, History)",
  goal: "Folder/repo zip upload, image preview + clipboard paste, and opt-in TTL history index.",
  phase: "phase-2",
  specs: ["06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md", "11-edge-cases.md"],
});
const e9 = createEpic({
  title: "Epic: Client-Side Encryption",
  goal: "Zero-knowledge AES-GCM encrypt-before-upload so the server only stores ciphertext; unlocks safe history.",
  phase: "phase-2",
  specs: ["07-encryption.md", "06-features-roadmap.md", "01-goals-and-scope.md"],
});
const e10 = createEpic({
  title: "Epic: Prompt Mode — Context Workspace",
  goal: "Local-first in-browser context buffer with replace-by-name, formatted copy, and optional push-to-other-PC.",
  phase: "phase-3",
  specs: ["08-prompt-mode.md", "06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md"],
});
const e11 = createEpic({
  title: "Epic: Future Upgrade Paths (WebRTC & Real-Time)",
  goal: "Evaluate and optionally implement P2P fast-path fallback and/or Durable Object WebSocket presence — only when relay limits bite.",
  phase: "future",
  specs: ["09-webrtc-alternative.md", "06-features-roadmap.md", "02-architecture.md"],
});

console.log(`Epics: #${e1.number}-#${e11.number}`);

const I = {};

function child(key, parent, title, body, labels) {
  I[key] = createChild({ title, body, parentId: parent.id, labels });
  process.stdout.write(".");
}

function sub(key, parentKey, title, body, labels = ["mvp"]) {
  I[key] = createChild({ title, body, parentId: I[parentKey].id, labels });
  process.stdout.write("s");
}

console.log("\nCreating child issues...");
child(
  "i1_1",
  e1,
  "Initialize Cloudflare Worker project with wrangler",
  "## Acceptance criteria\n- [ ] Worker project scaffolded via wrangler (wrangler.toml, src/worker.js)\n- [ ] Repo layout matches specs/03-tech-stack.md section 5\n- [ ] wrangler dev runs locally without errors\n\n## Spec refs\n- specs/03-tech-stack.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i1_2",
  e1,
  "Configure static assets binding and deploy hello page",
  "## Acceptance criteria\n- [ ] public/index.html served via [assets] binding\n- [ ] wrangler deploy succeeds to *.workers.dev URL\n- [ ] Deployed page shows a visible hello/works message\n\n## Spec refs\n- specs/03-tech-stack.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i1_3",
  e1,
  "Verify deployment loads on work network",
  "## Acceptance criteria\n- [ ] Deployed *.workers.dev URL opens on work PC browser\n- [ ] If blocked, document fallback path (custom domain per specs/11-edge-cases.md)\n- [ ] Smoke test recorded before further feature work\n\n## Spec refs\n- specs/12-mvp-build-checklist.md\n- specs/11-edge-cases.md",
);
child(
  "i2_1",
  e2,
  "Create KV namespace and R2 bucket bindings",
  "## Acceptance criteria\n- [ ] KV namespace created and bound as KV in wrangler.toml\n- [ ] R2 bucket relaypad-payloads created and bound as R2\n- [ ] Redeployed Worker can read/write a test KV key\n\n## Spec refs\n- specs/03-tech-stack.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i2_2",
  e2,
  "Implement KV and R2 key schema helpers",
  "## Acceptance criteria\n- [ ] pair:{token} stores status, created, lastActive\n- [ ] items:{token} stores ordered item index with seq, type, metadata, r2key\n- [ ] R2 keys use server-generated ids, not raw filenames\n- [ ] Small text inline in KV; large text spills to R2\n\n## Spec refs\n- specs/05-data-flow.md\n- specs/02-architecture.md",
);
child(
  "i2_3",
  e2,
  "Implement TTL strategy for tokens and sessions",
  "## Acceptance criteria\n- [ ] Unclaimed tokens expire ~10 min (KV TTL)\n- [ ] Paired sessions roll TTL on activity (~30-60 min inactivity)\n- [ ] Expired sessions reject further API use with clear error\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md",
);
child(
  "i2_4",
  e2,
  "Implement clear-session delete for token KV and R2 objects",
  "## Acceptance criteria\n- [ ] Clear session endpoint/action deletes pair + items KV keys for token\n- [ ] All R2 objects under token prefix deleted immediately\n- [ ] UI can trigger clear and returns to unpaired state\n\n## Spec refs\n- specs/05-data-flow.md\n- specs/11-edge-cases.md\n- specs/07-encryption.md",
);
child(
  "i2_5",
  e2,
  "Add Cron Trigger to sweep orphaned R2 objects",
  "## Acceptance criteria\n- [ ] Scheduled Cron Trigger configured in wrangler.toml\n- [ ] Sweep deletes R2 objects whose KV metadata has expired\n- [ ] Storage stays near zero after sessions end\n\n## Spec refs\n- specs/05-data-flow.md\n- specs/11-edge-cases.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i3_1",
  e3,
  "Add POST /api/pair endpoint to mint pairing token",
  "## Acceptance criteria\n- [ ] POST /api/pair returns { token } with 6-8 char unambiguous alphabet\n- [ ] Token stored in KV as waiting with ~10m TTL\n- [ ] Token collision remints automatically\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md\n- specs/11-edge-cases.md",
);
child(
  "i3_2",
  e3,
  "Add POST /api/pair/{token}/claim with single-claim guard",
  "## Acceptance criteria\n- [ ] Valid token transitions waiting to paired\n- [ ] Second claim on already-paired token rejected\n- [ ] Invalid/expired/typo tokens return clear errors\n- [ ] Session TTL extended on successful claim\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md\n- specs/11-edge-cases.md",
);
child(
  "i3_3",
  e3,
  "Add GET /api/{token}/status endpoint",
  "## Acceptance criteria\n- [ ] Returns { status: unpaired|waiting|paired|expired }\n- [ ] Both devices can poll status after pairing\n- [ ] lastActive updated on status checks (TTL roll)\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md",
);
child(
  "i4_1",
  e4,
  "Add POST /api/{token}/items endpoint for text payloads",
  "## Acceptance criteria\n- [ ] Accepts { type: text, content } for paired tokens only\n- [ ] Text stored verbatim (whitespace/newlines preserved)\n- [ ] Returns { itemId, seq/cursor }\n- [ ] Rejects uploads to unpaired/expired tokens\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md",
);
child(
  "i4_2",
  e4,
  "Add GET /api/{token}/items poll endpoint with cursor",
  "## Acceptance criteria\n- [ ] GET /api/{token}/items?since=cursor returns only newer items\n- [ ] Monotonic seq per token; no duplicates\n- [ ] Read-only poll (no KV writes on each poll)\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md",
);
child(
  "i4_3",
  e4,
  "Add POST /api/{token}/items file upload streaming to R2",
  "## Acceptance criteria\n- [ ] Multipart or raw body streamed to R2 without buffering whole file in Worker\n- [ ] Metadata { type:file, name, size, mime, itemId } indexed in KV\n- [ ] Multiple files = multiple items under same token\n- [ ] Zero-byte files transfer faithfully\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md\n- specs/02-architecture.md",
);
child(
  "i4_4",
  e4,
  "Add GET /api/{token}/items/{id}/download endpoint",
  "## Acceptance criteria\n- [ ] Streams R2 object with Content-Disposition: attachment\n- [ ] Safe Content-Type on download responses\n- [ ] Downloaded file is byte-identical to upload\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/05-data-flow.md\n- specs/07-encryption.md",
);
child(
  "i5_1",
  e5,
  "Build pairing UI for initiator and joiner flows",
  "## Acceptance criteria\n- [ ] Initiator: Start button, large token display, Copy token button\n- [ ] Joiner: token input + Connect button\n- [ ] Both sides poll status until Paired\n- [ ] Unambiguous token alphabet in display\n\n## Spec refs\n- specs/10-ui-ux.md\n- specs/04-mvp-spec.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i5_2",
  e5,
  "Build send workspace with textarea, drop zone, and file picker",
  "## Acceptance criteria\n- [ ] Textarea + Send button (Ctrl/Cmd+Enter shortcut)\n- [ ] Drag-drop zone + input type=file multiple fallback\n- [ ] Show file count + total size before send when dropping\n- [ ] Whole window is drop target when paired\n\n## Spec refs\n- specs/10-ui-ux.md\n- specs/04-mvp-spec.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i5_3",
  e5,
  "Build received items list with copy and download actions",
  "## Acceptance criteria\n- [ ] Items render newest first via poll loop\n- [ ] Text items: preview + Copy (Clipboard API)\n- [ ] File items: name, size, Download button\n- [ ] Subtle new-item pulse on arrival (respect prefers-reduced-motion)\n\n## Spec refs\n- specs/04-mvp-spec.md\n- specs/10-ui-ux.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i5_4",
  e5,
  "Implement connection status bar and poll loop with Page Visibility",
  "## Acceptance criteria\n- [ ] Status dot + label: grey=unpaired, amber=waiting, green=paired, red=lost\n- [ ] Poll ~2s when tab focused; backoff when blurred; pause when hidden\n- [ ] Clear empty states and actionable error toasts\n- [ ] State machine: UNPAIRED -> WAITING -> PAIRED -> EXPIRED\n\n## Spec refs\n- specs/10-ui-ux.md\n- specs/05-data-flow.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i6_1",
  e6,
  "Render all user content via textContent (no innerHTML)",
  "## Acceptance criteria\n- [ ] Text previews use textContent only\n- [ ] Filenames and metadata escaped on display\n- [ ] No stored XSS via text or filename fields\n\n## Spec refs\n- specs/07-encryption.md\n- specs/11-edge-cases.md\n- specs/12-mvp-build-checklist.md",
);
child(
  "i6_2",
  e6,
  "Enforce per-token item count and byte quotas",
  "## Acceptance criteria\n- [ ] Max items per token enforced with clear error\n- [ ] Max total bytes per token enforced\n- [ ] Single-request upload cap (~25-50MB) until chunked upload lands\n\n## Spec refs\n- specs/07-encryption.md\n- specs/11-edge-cases.md\n- specs/04-mvp-spec.md",
);
child(
  "i6_3",
  e6,
  "Rate-limit pairing claim attempts per IP",
  "## Acceptance criteria\n- [ ] Claim endpoint rate-limited per IP (KV counter or CF rate limiting)\n- [ ] High-entropy tokens (~40+ bits) used\n- [ ] Brute-force attempts throttled with sensible limits\n\n## Spec refs\n- specs/07-encryption.md\n- specs/11-edge-cases.md",
);
child(
  "i6_4",
  e6,
  "Add poll retry backoff and connection-lost messaging",
  "## Acceptance criteria\n- [ ] Intermittent poll failures retry with backoff\n- [ ] UI shows Connection lost — retrying when appropriate\n- [ ] Session persists in KV across reconnects\n\n## Spec refs\n- specs/11-edge-cases.md\n- specs/10-ui-ux.md",
);
child(
  "i6_5",
  e6,
  "Sanitize filenames and use server-generated R2 keys",
  "## Acceptance criteria\n- [ ] R2 object keys derived from server itemId, not user filename\n- [ ] Original filename stored as metadata only\n- [ ] Unsafe filename chars handled safely on display\n- [ ] No path traversal in storage keys\n\n## Spec refs\n- specs/11-edge-cases.md\n- specs/07-encryption.md",
);
child(
  "i7_1",
  e7,
  "Add R2 multipart upload API (init, chunk, complete)",
  "## Acceptance criteria\n- [ ] POST /api/{token}/items initiates multipart for large files\n- [ ] PUT /api/{token}/items/{itemId}/chunk?part=n streams each ~8MB part\n- [ ] POST /api/{token}/items/{itemId}/complete finalizes upload\n- [ ] Item visible to receiver only after complete\n\n## Spec refs\n- specs/05-data-flow.md\n- specs/04-mvp-spec.md",
  ["phase-1.5"],
);
child(
  "i7_2",
  e7,
  "Add client chunked upload with per-part retry",
  "## Acceptance criteria\n- [ ] Client splits files into ~8MB chunks under 100MB body limit\n- [ ] Failed chunk retries only that part\n- [ ] Upload resumes after transient network errors\n\n## Spec refs\n- specs/05-data-flow.md\n- specs/11-edge-cases.md",
  ["phase-1.5"],
);
child(
  "i7_3",
  e7,
  "Show upload progress bar for chunked uploads",
  "## Acceptance criteria\n- [ ] Per-file progress bar during chunked upload\n- [ ] Progress reflects completed parts vs total\n- [ ] Essential UX per specs/10-ui-ux.md\n\n## Spec refs\n- specs/10-ui-ux.md\n- specs/06-features-roadmap.md",
  ["phase-1.5"],
);
child(
  "i8_1",
  e8,
  "Add client-side folder zip upload with JSZip",
  "## Acceptance criteria\n- [ ] Folder enumerated via webkitdirectory or drag-drop\n- [ ] Client zips folder with JSZip preserving relative paths\n- [ ] Zip uploaded as single item via existing/chunked transfer\n- [ ] Receiver downloads usable archive\n\n## Spec refs\n- specs/06-features-roadmap.md\n- specs/03-tech-stack.md",
  ["phase-2"],
);
child(
  "i8_2",
  e8,
  "Add optional gitignore-style excludes for repo zips",
  "## Acceptance criteria\n- [ ] Skip node_modules, .git, build dirs by default\n- [ ] Optional respect .gitignore if present\n- [ ] Excludes configurable before zip\n\n## Spec refs\n- specs/06-features-roadmap.md",
  ["phase-2"],
);
child(
  "i8_3",
  e8,
  "Add image thumbnail preview on receive",
  "## Acceptance criteria\n- [ ] Image MIME types render thumbnail/preview on receiver\n- [ ] Previews use blob object URLs, not server-rendered HTML\n- [ ] Download still available alongside preview\n\n## Spec refs\n- specs/06-features-roadmap.md\n- specs/07-encryption.md",
  ["phase-2"],
);
child(
  "i8_4",
  e8,
  "Add clipboard paste support for images",
  "## Acceptance criteria\n- [ ] paste event captures image blobs from clipboard\n- [ ] Pasted screenshots queue as file items\n- [ ] Works alongside existing text paste flow\n\n## Spec refs\n- specs/06-features-roadmap.md\n- specs/10-ui-ux.md",
  ["phase-2"],
);
child(
  "i8_5",
  e8,
  "Add opt-in TTL history index",
  "## Acceptance criteria\n- [ ] History list shows recent transfers (text snippets + filenames + timestamps)\n- [ ] Opt-in toggle; default off\n- [ ] History index auto-expires via TTL\n- [ ] Requires encryption (blocked until Epic 9 lands)\n\n## Spec refs\n- specs/06-features-roadmap.md\n- specs/11-edge-cases.md\n- specs/07-encryption.md",
  ["phase-2"],
);
child(
  "i9_1",
  e9,
  "Implement AES-GCM encrypt-before-upload in browser",
  "## Acceptance criteria\n- [ ] Random symmetric key generated via Web Crypto API\n- [ ] Payloads encrypted with AES-GCM before POST upload\n- [ ] Server stores ciphertext + IV + algorithm tag only\n- [ ] Worker remains a dumb pipe (no server-side crypto)\n\n## Spec refs\n- specs/07-encryption.md",
  ["phase-2"],
);
child(
  "i9_2",
  e9,
  "Share encryption key via URL fragment and copy button",
  "## Acceptance criteria\n- [ ] Key never sent to server (URL fragment #key=...)\n- [ ] Copy button shares key out-of-band to other device\n- [ ] Pair token (routing) and key (crypto) kept separate\n\n## Spec refs\n- specs/07-encryption.md",
  ["phase-2"],
);
child(
  "i9_3",
  e9,
  "Add optional passphrase-derived key mode",
  "## Acceptance criteria\n- [ ] Both devices can enter shared passphrase\n- [ ] Key derived via PBKDF2 (Web Crypto)\n- [ ] Optional alternative when key paste is impractical\n\n## Spec refs\n- specs/07-encryption.md",
  ["phase-2"],
);
child(
  "i9_4",
  e9,
  "Decrypt ciphertext after download on receiver",
  "## Acceptance criteria\n- [ ] Receiver decrypts after download using shared key\n- [ ] Encrypted format versioned for future evolution\n- [ ] Plaintext only in browser memory after decrypt\n\n## Spec refs\n- specs/07-encryption.md\n- specs/01-goals-and-scope.md",
  ["phase-2"],
);
child(
  "i10_1",
  e10,
  "Store context buffer in IndexedDB with folder tree UI",
  "## Acceptance criteria\n- [ ] Files read into browser via FileReader / directory input\n- [ ] Buffer persisted in IndexedDB (survives refresh)\n- [ ] Folder structure shown as expandable tree\n- [ ] Per-file remove control\n\n## Spec refs\n- specs/08-prompt-mode.md\n- specs/10-ui-ux.md",
  ["phase-3"],
);
child(
  "i10_2",
  e10,
  "Implement replace-by-name on re-drop with prompt",
  "## Acceptance criteria\n- [ ] Matching relative path triggers Replace / Keep both / Cancel prompt\n- [ ] Optional auto-replace matching names toggle\n- [ ] Updated timestamp indicator on replaced files\n- [ ] Default-skip noise dirs (node_modules, .git, etc.)\n\n## Spec refs\n- specs/08-prompt-mode.md",
  ["phase-3"],
);
child(
  "i10_3",
  e10,
  "Add formatted copy output with token size estimate",
  "## Acceptance criteria\n- [ ] Copy serializes buffer to chat-context format (tree + fenced blocks)\n- [ ] Language inferred from file extension\n- [ ] Binary files marked [binary omitted]\n- [ ] Live token estimate (chars / ~4)\n- [ ] Download as .md/.txt option\n\n## Spec refs\n- specs/08-prompt-mode.md",
  ["phase-3"],
);
child(
  "i10_4",
  e10,
  "Add optional push buffer to other PC via transfer channel",
  "## Acceptance criteria\n- [ ] Push buffer action zips buffer and sends via transfer API\n- [ ] Receiver can import buffer on other device\n- [ ] Reuses Phase 1/2 transfer plumbing\n\n## Spec refs\n- specs/08-prompt-mode.md",
  ["phase-3"],
);
child(
  "i11_1",
  e11,
  "Evaluate and implement WebRTC P2P fast path with relay fallback",
  "## Acceptance criteria\n- [ ] Pair via existing token; attempt WebRTC data channel\n- [ ] Auto-fallback to relay if P2P fails within timeout\n- [ ] Relay remains default; P2P is opportunistic only\n- [ ] Only pursued when relay limits bite AND work-network P2P confirmed\n\n## Spec refs\n- specs/09-webrtc-alternative.md\n- specs/06-features-roadmap.md",
  ["future"],
);
child(
  "i11_2",
  e11,
  "Evaluate and implement Durable Object WebSocket presence",
  "## Acceptance criteria\n- [ ] Real-time push replaces polling when implemented\n- [ ] Presence indicator (other PC is here)\n- [ ] Polling remains fallback\n- [ ] Only pursued as UX nicety after core relay stable\n\n## Spec refs\n- specs/02-architecture.md\n- specs/06-features-roadmap.md",
  ["future"],
);

console.log("\nCreating sub-issues...");
sub(
  "i5_1a",
  "i5_1",
  "Add initiator pairing view with token display",
  "## Acceptance criteria\n- [ ] Start button calls POST /api/pair\n- [ ] Large monospace token display\n- [ ] Copy token button uses Clipboard API\n- [ ] Waiting for other device status shown",
);
sub(
  "i5_1b",
  "i5_1",
  "Add joiner pairing view with token input",
  "## Acceptance criteria\n- [ ] Token input field with unambiguous charset validation\n- [ ] Connect button calls POST /api/pair/{token}/claim\n- [ ] Clear errors for typo/expired/already-claimed tokens",
);
sub(
  "i5_1c",
  "i5_1",
  "Wire pairing views to status polling until Paired",
  "## Acceptance criteria\n- [ ] Both views poll GET /api/{token}/status until paired\n- [ ] Transition to paired workspace on success\n- [ ] Handle expired token during wait",
);
sub(
  "i5_2a",
  "i5_2",
  "Add text send area with textarea and Send button",
  "## Acceptance criteria\n- [ ] Textarea + Send posts to POST /api/{token}/items\n- [ ] Ctrl/Cmd+Enter sends text\n- [ ] Textarea clears after successful send",
);
sub(
  "i5_2b",
  "i5_2",
  "Add drag-drop file zone with whole-window target",
  "## Acceptance criteria\n- [ ] Drop zone highlights on drag-over when paired\n- [ ] Shows file count + total size before upload\n- [ ] Uploads each file via transfer API",
);
sub(
  "i5_2c",
  "i5_2",
  "Add file picker fallback input",
  "## Acceptance criteria\n- [ ] input type=file multiple as fallback\n- [ ] Same upload path as drag-drop\n- [ ] Works when drag-drop unavailable",
);
sub(
  "i8_1a",
  "i8_1",
  "Enumerate folder files via webkitdirectory",
  "## Acceptance criteria\n- [ ] webkitdirectory input enumerates all files with relative paths\n- [ ] Drag-drop folder supported where browser allows\n- [ ] Graceful fallback note if unsupported",
  ["phase-2"],
);
sub(
  "i8_1b",
  "i8_1",
  "Zip enumerated folder client-side with JSZip",
  "## Acceptance criteria\n- [ ] JSZip packages folder preserving relative paths\n- [ ] Zip uploaded as single transfer item\n- [ ] Uses chunked upload when zip exceeds single-request limit",
  ["phase-2"],
);
sub(
  "i10_1a",
  "i10_1",
  "Implement IndexedDB buffer storage layer",
  "## Acceptance criteria\n- [ ] Buffer read/write/clear in IndexedDB\n- [ ] Survives page refresh\n- [ ] Clear buffer wipes workspace data",
  ["phase-3"],
);
sub(
  "i10_1b",
  "i10_1",
  "Build folder tree UI component for context buffer",
  "## Acceptance criteria\n- [ ] Expandable tree by relative path\n- [ ] Per-file remove control\n- [ ] Two-pane layout shell (buffer left)",
  ["phase-3"],
);
sub(
  "i10_1c",
  "i10_1",
  "Read dropped files and folders into buffer",
  "## Acceptance criteria\n- [ ] Drag-drop files/folders into buffer pane\n- [ ] FileReader reads contents into memory/IndexedDB\n- [ ] Warn before reading huge repos; offer excludes first",
  ["phase-3"],
);
sub(
  "i10_3a",
  "i10_3",
  "Implement chat-context formatter with fenced code blocks",
  "## Acceptance criteria\n- [ ] Optional header + file tree summary\n- [ ] Each file: path heading + fenced block with inferred language\n- [ ] Binary files marked [binary omitted]",
  ["phase-3"],
);
sub(
  "i10_3b",
  "i10_3",
  "Add copy-to-clipboard and download formatted output",
  "## Acceptance criteria\n- [ ] Copy button writes formatted blob to clipboard\n- [ ] Download as .md/.txt option\n- [ ] Live token estimate displayed",
  ["phase-3"],
);
sub(
  "i9_1a",
  "i9_1",
  "Encrypt text and file payloads before upload",
  "## Acceptance criteria\n- [ ] AES-GCM via Web Crypto before POST /items\n- [ ] IV + ciphertext + tag stored together\n- [ ] Format version field for evolution",
  ["phase-2"],
);
sub(
  "i9_1b",
  "i9_1",
  "Handle encrypted metadata in item index",
  "## Acceptance criteria\n- [ ] Item metadata indicates encrypted flag + algorithm version\n- [ ] Server cannot read payload contents\n- [ ] Compatible with existing poll/download flow",
  ["phase-2"],
);

console.log("\nSetting dependencies...");
const block = (blocked, blocker) => addBlockedBy(I[blocked].id, I[blocker].id);

block("i1_2", "i1_1");
block("i1_3", "i1_2");
block("i2_1", "i1_2");
block("i2_2", "i2_1");
block("i2_3", "i2_2");
block("i2_4", "i2_2");
block("i2_5", "i2_3");
block("i3_1", "i2_2");
block("i3_2", "i3_1");
block("i3_3", "i3_2");
block("i4_1", "i3_2");
block("i4_2", "i4_1");
block("i4_3", "i4_1");
block("i4_4", "i4_3");
block("i5_1", "i3_3");
block("i5_2", "i4_1");
block("i5_3", "i4_2");
block("i5_3", "i4_4");
block("i5_4", "i5_1");
block("i5_1b", "i5_1a");
block("i5_1c", "i5_1a");
block("i5_1c", "i5_1b");
block("i5_2b", "i5_2a");
block("i5_2c", "i5_2a");
block("i6_1", "i5_3");
block("i6_2", "i4_3");
block("i6_3", "i3_2");
block("i6_4", "i5_4");
block("i6_5", "i4_3");
block("i7_1", "i4_3");
block("i7_2", "i7_1");
block("i7_3", "i7_2");
block("i8_1", "i7_1");
block("i8_1b", "i8_1a");
block("i8_2", "i8_1");
block("i8_3", "i5_3");
block("i8_4", "i8_3");
block("i8_5", "i9_1");
block("i9_1", "i4_4");
block("i9_1b", "i9_1a");
block("i9_2", "i9_1");
block("i9_3", "i9_1");
block("i9_4", "i9_1");
block("i10_1", "i8_1");
block("i10_1b", "i10_1a");
block("i10_1c", "i10_1a");
block("i10_2", "i10_1");
block("i10_3", "i10_1");
block("i10_3b", "i10_3a");
block("i10_4", "i10_1");
block("i10_4", "i7_1");
block("i11_1", "i7_1");
block("i11_2", "i5_4");

const depMap = {
  i1_1: [],
  i1_2: ["i1_1"],
  i1_3: ["i1_2"],
  i2_1: ["i1_2"],
  i2_2: ["i2_1"],
  i2_3: ["i2_2"],
  i2_4: ["i2_2"],
  i2_5: ["i2_3"],
  i3_1: ["i2_2"],
  i3_2: ["i3_1"],
  i3_3: ["i3_2"],
  i4_1: ["i3_2"],
  i4_2: ["i4_1"],
  i4_3: ["i4_1"],
  i4_4: ["i4_3"],
  i5_1: ["i3_3"],
  i5_2: ["i4_1"],
  i5_3: ["i4_2", "i4_4"],
  i5_4: ["i5_1"],
  i5_1a: ["i3_3"],
  i5_1b: ["i5_1a"],
  i5_1c: ["i5_1a", "i5_1b"],
  i5_2a: ["i4_1"],
  i5_2b: ["i5_2a"],
  i5_2c: ["i5_2a"],
  i6_1: ["i5_3"],
  i6_2: ["i4_3"],
  i6_3: ["i3_2"],
  i6_4: ["i5_4"],
  i6_5: ["i4_3"],
  i7_1: ["i4_3"],
  i7_2: ["i7_1"],
  i7_3: ["i7_2"],
  i8_1: ["i7_1"],
  i8_1a: ["i7_1"],
  i8_1b: ["i8_1a"],
  i8_2: ["i8_1"],
  i8_3: ["i5_3"],
  i8_4: ["i8_3"],
  i8_5: ["i9_1"],
  i9_1: ["i4_4"],
  i9_1a: ["i4_4"],
  i9_1b: ["i9_1a"],
  i9_2: ["i9_1"],
  i9_3: ["i9_1"],
  i9_4: ["i9_1"],
  i10_1: ["i8_1"],
  i10_1a: ["i8_1"],
  i10_1b: ["i10_1a"],
  i10_1c: ["i10_1a"],
  i10_2: ["i10_1"],
  i10_3: ["i10_1"],
  i10_3a: ["i10_1"],
  i10_3b: ["i10_3a"],
  i10_4: ["i10_1", "i7_1"],
  i11_1: ["i7_1"],
  i11_2: ["i5_4"],
};

console.log("Adding blocked-by notes and ready labels...");
for (const [key, blockers] of Object.entries(depMap)) {
  const nums = blockers.map((b) => I[b].number);
  setBlockedByNote(I[key].number, nums);
  if (nums.length === 0) markReady(I[key].number);
}

console.log("\nDone!");
console.log(`Epics: #${e1.number}-#${e11.number}`);
console.log(`First ready issue: #${I.i1_1.number}`);
console.log(`Repo: https://github.com/aureau/peer/issues`);
