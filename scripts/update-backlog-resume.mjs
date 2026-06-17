import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ID = {
  25: "I_kwDOS89O788AAAABFv1SkA", 36: "I_kwDOS89O788AAAABFv1cHQ", 39: "I_kwDOS89O788AAAABFv1fDA",
  40: "I_kwDOS89O788AAAABFv1f9g", 48: "I_kwDOS89O788AAAABFv1mNQ", 59: "I_kwDOS89O788AAAABFv1vmQ",
  60: "I_kwDOS89O788AAAABFv1wnw", 61: "I_kwDOS89O788AAAABFv1xtw",
};

function sh(cmd) { return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim(); }
function gqlInput(obj) {
  const tmp = join(tmpdir(), `gql-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(tmp, JSON.stringify(obj), "utf8");
  try {
    const out = sh(`gh api graphql --input ${JSON.stringify(tmp)}`);
    const j = JSON.parse(out);
    if (j.errors?.length) throw new Error(JSON.stringify(j.errors));
    return j.data;
  } finally { try { unlinkSync(tmp); } catch {} }
}
function edit(num, { title, body, add = [], remove = [] }) {
  const parts = [`gh issue edit ${num}`];
  if (title) parts.push(`--title ${JSON.stringify(title)}`);
  let tmp;
  if (body) { tmp = join(tmpdir(), `body-${num}.md`); writeFileSync(tmp, body, "utf8"); parts.push(`--body-file ${JSON.stringify(tmp)}`); }
  for (const l of add) parts.push(`--add-label ${JSON.stringify(l)}`);
  for (const l of remove) parts.push(`--remove-label ${JSON.stringify(l)}`);
  try { sh(parts.join(" ")); } finally { if (tmp) try { unlinkSync(tmp); } catch {} }
  process.stdout.write(".");
}
function addBlock(b, k) { try { gqlInput({ query: "mutation($b:ID!,$k:ID!){addBlockedBy(input:{issueId:$b,blockingIssueId:$k}){issue{number}}}", variables: { b: ID[b], k: ID[k] } }); } catch (e) { if (!String(e).includes("duplicate") && !String(e).includes("already")) throw e; } }
function rmBlock(b, k) { try { gqlInput({ query: "mutation($b:ID!,$k:ID!){removeBlockedBy(input:{issueId:$b,blockingIssueId:$k}){issue{number}}}", variables: { b: ID[b], k: ID[k] } }); } catch (e) {} }

const AC = (lines) => "## Acceptance criteria\n" + lines.map((l) => `- [ ] ${l}`).join("\n");
const refs = (arr) => "\n\n## Spec refs\n" + arr.map((r) => `- specs/${r}`).join("\n");
const blocked = (nums) => (nums.length ? `\n\n**blocked-by:** ${nums.map((n) => `#${n}`).join(", ")}` : "");

console.log("Resuming...");
edit(61, {
  title: "Zip context-buffer folder client-side with JSZip (Prompt Mode)",
  body: AC([
    "JSZip packages a buffer folder preserving relative paths into a single .zip",
    "Produced .zip is sent as one transfer item",
    "Foundation for the zip->send->unzip flow (#39)",
  ]) + blocked([39]),
  add: ["phase-3"], remove: ["phase-2"],
});
edit(40, {
  title: "Add folder-send polish (excludes, per-file toggles, receiver reconstruction)",
  body: AC([
    "Optional excludes (node_modules, .git, build dirs) for folder sends",
    "Per-file include/exclude toggles before sending",
    "Receiver-side folder reconstruction on download using relativePath metadata",
  ]) + refs(["06-features-roadmap.md"]) + blocked([60]),
});
edit(59, {
  title: "Add file picker fallback input",
  body: AC([
    "`input type=file multiple` as fallback to drag-drop",
    "Same upload path as drag-drop and folder picker",
    "Works when drag-drop unavailable",
  ]) + blocked([57]),
});
edit(58, {
  title: "Add drag-drop file zone with whole-window target",
  body: AC([
    "Drop zone highlights on drag-over when paired",
    "Shows file count + total size before upload",
    "Reject files over 100MB with a clear inline message",
    "Uploads each file via the transfer API",
  ]) + blocked([57]),
});
edit(51, {
  title: "Add optional push buffer to other PC via transfer channel",
  body: AC([
    "Push buffer zips the buffer (single .zip item) and sends via the transfer API",
    "Subject to the 100MB cap until chunked upload lands in Phase 2",
    "Receiver imports the buffer on the other device; reuses transfer plumbing",
  ]) + refs(["08-prompt-mode.md"]) + blocked([48, 25]),
});

console.log("\nNative dependency fixes...");
rmBlock(60, 36); addBlock(60, 59);
rmBlock(39, 36); addBlock(39, 48); addBlock(39, 25);
rmBlock(61, 60); addBlock(61, 39);
addBlock(40, 60);

console.log("\nResume done.");
