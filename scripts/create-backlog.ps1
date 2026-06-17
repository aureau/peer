# Creates relaypad GitHub backlog: epics, child issues, sub-issues, dependencies, ready labels
$ErrorActionPreference = "Stop"
$RepoId = "R_kgDOS89O7w"

function New-Epic {
    param([string]$Title, [string]$Goal, [string]$Phase, [string[]]$Specs, [string[]]$ExtraLabels = @())
    $labels = @("epic", $Phase) + $ExtraLabels
    $specList = ($Specs | ForEach-Object { "- specs/$_" }) -join "`n"
    $body = @"
## Goal
$Goal

## Spec coverage
$specList

## Phase
$Phase
"@
    $num = gh issue create --title $Title --body $body --label ($labels -join ",") --json number,id -q ".number"
    $id = gh issue view $num --json id -q ".id"
    Write-Output @{ number = [int]$num; id = $id; title = $Title }
}

function New-ChildIssue {
    param(
        [string]$Title,
        [string]$Body,
        [string]$ParentId,
        [string[]]$Labels = @("mvp")
    )
    $labelStr = ($Labels -join ",")
    # Escape for GraphQL string
    $escapedBody = $Body -replace '\\', '\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
    $escapedTitle = $Title -replace '\\', '\\' -replace '"', '\"'
    $query = "mutation { createIssue(input: { repositoryId: `"$RepoId`", title: `"$escapedTitle`", body: `"$escapedBody`", parentIssueId: `"$ParentId`" }) { issue { number id title } } }"
    $result = gh api graphql -f query=$query | ConvertFrom-Json
    if ($result.errors) { throw ($result.errors | ConvertTo-Json) }
    $issue = $result.data.createIssue.issue
    if ($labelStr) { gh issue edit $issue.number --add-label $labelStr | Out-Null }
    Write-Output @{ number = [int]$issue.number; id = $issue.id; title = $issue.title }
}

function New-SubIssue {
    param(
        [string]$Title,
        [string]$Body,
        [string]$ParentId,
        [string[]]$Labels = @("mvp")
    )
    New-ChildIssue -Title $Title -Body $Body -ParentId $ParentId -Labels $Labels
}

function Add-BlockedBy {
    param([string]$BlockedId, [string]$BlockerId)
    $query = "mutation { addBlockedBy(input: { issueId: `"$BlockedId`", blockingIssueId: `"$BlockerId`" }) { issue { number } } }"
    gh api graphql -f query=$query | Out-Null
}

function Set-BlockedByNote {
    param([int]$Number, [int[]]$Blockers)
    if ($Blockers.Count -eq 0) { return }
    $existing = gh issue view $Number --json body -q ".body"
    $note = ($Blockers | ForEach-Object { "#$_" }) -join ", "
    if ($existing -notmatch "blocked-by:") {
        $updated = $existing.TrimEnd() + "`n`n**blocked-by:** $note"
        gh issue edit $Number --body $updated | Out-Null
    }
}

function Mark-Ready {
    param([int]$Number)
    gh issue edit $Number --add-label "ready" | Out-Null
}

# --- EPICS ---
Write-Host "Creating epics..."
$e1 = New-Epic -Title "Epic: Project Foundation & Deployment" -Goal "Stand up a deployable Cloudflare Worker that serves static UI on *.workers.dev and passes the work-network smoke test." -Phase "mvp" -Specs @("03-tech-stack.md", "02-architecture.md", "12-mvp-build-checklist.md")
$e2 = New-Epic -Title "Epic: Storage Bindings & Data Lifecycle" -Goal "Wire KV + R2 with the token/item schema, TTL strategy, clear-session delete, and orphan sweep." -Phase "mvp" -Specs @("02-architecture.md", "05-data-flow.md", "04-mvp-spec.md", "11-edge-cases.md", "12-mvp-build-checklist.md")
$e3 = New-Epic -Title "Epic: Pairing & Session API" -Goal "Implement token mint, single-claim join, status polling, and session TTL rollover." -Phase "mvp" -Specs @("04-mvp-spec.md", "05-data-flow.md", "11-edge-cases.md", "12-mvp-build-checklist.md")
$e4 = New-Epic -Title "Epic: Payload Transfer API" -Goal "Ship text + small-file send/receive over HTTPS with cursor-based polling and streamed R2 download." -Phase "mvp" -Specs @("04-mvp-spec.md", "05-data-flow.md", "12-mvp-build-checklist.md")
$e5 = New-Epic -Title "Epic: Transfer Mode UI" -Goal "Vanilla HTML/JS/CSS for pairing, send/receive workspace, drag-drop, copy/download, and connection status." -Phase "mvp" -Specs @("04-mvp-spec.md", "10-ui-ux.md", "05-data-flow.md", "12-mvp-build-checklist.md")
$e6 = New-Epic -Title "Epic: MVP Safety, Limits & Edge Cases" -Goal "Harden the relay with XSS-safe rendering, quotas, rate limits, and resilient error/recovery paths." -Phase "mvp" -Specs @("07-encryption.md", "11-edge-cases.md", "04-mvp-spec.md", "12-mvp-build-checklist.md")
$e7 = New-Epic -Title "Epic: Large-File Chunked Upload" -Goal "R2 multipart chunked upload so repos/large files exceed the 100MB single-request ceiling reliably." -Phase "phase-1.5" -Specs @("04-mvp-spec.md", "05-data-flow.md", "06-features-roadmap.md", "11-edge-cases.md", "12-mvp-build-checklist.md")
$e8 = New-Epic -Title "Epic: Phase 2 Ergonomics (Folders, Images, History)" -Goal "Folder/repo zip upload, image preview + clipboard paste, and opt-in TTL history index." -Phase "phase-2" -Specs @("06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md", "11-edge-cases.md")
$e9 = New-Epic -Title "Epic: Client-Side Encryption" -Goal "Zero-knowledge AES-GCM encrypt-before-upload so the server only stores ciphertext; unlocks safe history." -Phase "phase-2" -Specs @("07-encryption.md", "06-features-roadmap.md", "01-goals-and-scope.md")
$e10 = New-Epic -Title "Epic: Prompt Mode — Context Workspace" -Goal "Local-first in-browser context buffer with replace-by-name, formatted copy, and optional push-to-other-PC." -Phase "phase-3" -Specs @("08-prompt-mode.md", "06-features-roadmap.md", "01-goals-and-scope.md", "10-ui-ux.md")
$e11 = New-Epic -Title "Epic: Future Upgrade Paths (WebRTC & Real-Time)" -Goal "Evaluate and optionally implement P2P fast-path fallback and/or Durable Object WebSocket presence — only when relay limits bite." -Phase "future" -Specs @("09-webrtc-alternative.md", "06-features-roadmap.md", "02-architecture.md")

Write-Host "Epics: $($e1.number)-$($e11.number)"

# --- CHILD ISSUES ---
$issues = @{}

# Epic 1
$issues.i1_1 = New-ChildIssue -ParentId $e1.id -Title "Initialize Cloudflare Worker project with wrangler" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Worker project scaffolded via wrangler (wrangler.toml, src/worker.js)`n- [ ] Repo layout matches specs/03-tech-stack.md §5`n- [ ] wrangler dev runs locally without errors`n`n## Spec refs`n- specs/03-tech-stack.md §4-6`n- specs/12-mvp-build-checklist.md §0-1"
$issues.i1_2 = New-ChildIssue -ParentId $e1.id -Title "Configure static assets binding and deploy hello page" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] public/index.html served via [assets] binding`n- [ ] wrangler deploy succeeds to *.workers.dev URL`n- [ ] Deployed page shows a visible hello/works message`n`n## Spec refs`n- specs/03-tech-stack.md §2`n- specs/12-mvp-build-checklist.md §1"
$issues.i1_3 = New-ChildIssue -ParentId $e1.id -Title "Verify deployment loads on work network" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Deployed *.workers.dev URL opens on work PC browser`n- [ ] If blocked, document fallback path (custom domain per specs/11-edge-cases.md §1)`n- [ ] Smoke test recorded before further feature work`n`n## Spec refs`n- specs/12-mvp-build-checklist.md §1 (CRITICAL TEST)`n- specs/11-edge-cases.md §1"

# Epic 2
$issues.i2_1 = New-ChildIssue -ParentId $e2.id -Title "Create KV namespace and R2 bucket bindings" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] KV namespace created and bound as KV in wrangler.toml`n- [ ] R2 bucket relaypad-payloads created and bound as R2`n- [ ] Redeployed Worker can read/write a test KV key`n`n## Spec refs`n- specs/03-tech-stack.md §2`n- specs/12-mvp-build-checklist.md §2"
$issues.i2_2 = New-ChildIssue -ParentId $e2.id -Title "Implement KV and R2 key schema helpers" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] pair:{token} stores status, created, lastActive`n- [ ] items:{token} stores ordered item index with seq, type, metadata, r2key`n- [ ] R2 keys use server-generated ids, not raw filenames`n- [ ] Small text inline in KV; large text spills to R2`n`n## Spec refs`n- specs/05-data-flow.md §6`n- specs/02-architecture.md §1"
$issues.i2_3 = New-ChildIssue -ParentId $e2.id -Title "Implement TTL strategy for tokens and sessions" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Unclaimed tokens expire ~10 min (KV TTL)`n- [ ] Paired sessions roll TTL on activity (~30-60 min inactivity)`n- [ ] Expired sessions reject further API use with clear error`n`n## Spec refs`n- specs/04-mvp-spec.md §2, §7`n- specs/05-data-flow.md §7"
$issues.i2_4 = New-ChildIssue -ParentId $e2.id -Title "Implement clear-session delete for token KV and R2 objects" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Clear session endpoint/action deletes pair + items KV keys for token`n- [ ] All R2 objects under token prefix deleted immediately`n- [ ] UI can trigger clear and returns to unpaired state`n`n## Spec refs`n- specs/05-data-flow.md §7`n- specs/11-edge-cases.md §5`n- specs/07-encryption.md §5"
$issues.i2_5 = New-ChildIssue -ParentId $e2.id -Title "Add Cron Trigger to sweep orphaned R2 objects" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Scheduled Cron Trigger configured in wrangler.toml`n- [ ] Sweep deletes R2 objects whose KV metadata has expired`n- [ ] Storage stays near zero after sessions end`n`n## Spec refs`n- specs/05-data-flow.md §7`n- specs/11-edge-cases.md §5`n- specs/12-mvp-build-checklist.md §7 (stretch)"

# Epic 3
$issues.i3_1 = New-ChildIssue -ParentId $e3.id -Title "Add POST /api/pair endpoint to mint pairing token" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] POST /api/pair returns { token } with 6-8 char unambiguous alphabet`n- [ ] Token stored in KV as waiting with ~10m TTL`n- [ ] Token collision remints automatically`n`n## Spec refs`n- specs/04-mvp-spec.md §2, §9`n- specs/05-data-flow.md §1`n- specs/11-edge-cases.md §2"
$issues.i3_2 = New-ChildIssue -ParentId $e3.id -Title "Add POST /api/pair/{token}/claim with single-claim guard" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Valid token transitions waiting → paired`n- [ ] Second claim on already-paired token rejected`n- [ ] Invalid/expired/typo tokens return clear errors`n- [ ] Session TTL extended on successful claim`n`n## Spec refs`n- specs/04-mvp-spec.md §2, §9`n- specs/05-data-flow.md §1`n- specs/11-edge-cases.md §2"
$issues.i3_3 = New-ChildIssue -ParentId $e3.id -Title "Add GET /api/{token}/status endpoint" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Returns { status: unpaired|waiting|paired|expired }`n- [ ] Both devices can poll status after pairing`n- [ ] lastActive updated on status checks (TTL roll)`n`n## Spec refs`n- specs/04-mvp-spec.md §6, §9`n- specs/05-data-flow.md §1"

# Epic 4
$issues.i4_1 = New-ChildIssue -ParentId $e4.id -Title "Add POST /api/{token}/items endpoint for text payloads" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Accepts { type: text, content } for paired tokens only`n- [ ] Text stored verbatim (whitespace/newlines preserved)`n- [ ] Returns { itemId, seq/cursor }`n- [ ] Rejects uploads to unpaired/expired tokens`n`n## Spec refs`n- specs/04-mvp-spec.md §3, §9`n- specs/05-data-flow.md §2"
$issues.i4_2 = New-ChildIssue -ParentId $e4.id -Title "Add GET /api/{token}/items poll endpoint with cursor" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] GET /api/{token}/items?since=cursor returns only newer items`n- [ ] Monotonic seq per token; no duplicates`n- [ ] Read-only poll (no KV writes on each poll)`n`n## Spec refs`n- specs/04-mvp-spec.md §5, §9`n- specs/05-data-flow.md §2, §5"
$issues.i4_3 = New-ChildIssue -ParentId $e4.id -Title "Add POST /api/{token}/items file upload streaming to R2" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Multipart or raw body streamed to R2 without buffering whole file in Worker`n- [ ] Metadata { type:file, name, size, mime, itemId } indexed in KV`n- [ ] Multiple files = multiple items under same token`n- [ ] Zero-byte files transfer faithfully`n`n## Spec refs`n- specs/04-mvp-spec.md §4, §9`n- specs/05-data-flow.md §3`n- specs/02-architecture.md §3"
$issues.i4_4 = New-ChildIssue -ParentId $e4.id -Title "Add GET /api/{token}/items/{id}/download endpoint" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Streams R2 object with Content-Disposition: attachment`n- [ ] Safe Content-Type on download responses`n- [ ] Downloaded file is byte-identical to upload`n`n## Spec refs`n- specs/04-mvp-spec.md §5, §9`n- specs/05-data-flow.md §3`n- specs/07-encryption.md §4"

# Epic 5
$issues.i5_1 = New-ChildIssue -ParentId $e5.id -Title "Build pairing UI for initiator and joiner flows" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Initiator: Start button, large token display, Copy token button`n- [ ] Joiner: token input + Connect button`n- [ ] Both sides poll status until Paired`n- [ ] Unambiguous token alphabet in display`n`n## Spec refs`n- specs/10-ui-ux.md §1-2`n- specs/04-mvp-spec.md §6`n- specs/12-mvp-build-checklist.md §3"
$issues.i5_2 = New-ChildIssue -ParentId $e5.id -Title "Build send workspace with textarea, drop zone, and file picker" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Textarea + Send button (Ctrl/Cmd+Enter shortcut)`n- [ ] Drag-drop zone + input type=file multiple fallback`n- [ ] Show file count + total size before send when dropping`n- [ ] Whole window is drop target when paired`n`n## Spec refs`n- specs/10-ui-ux.md §2-4`n- specs/04-mvp-spec.md §3-4`n- specs/12-mvp-build-checklist.md §4-5"
$issues.i5_3 = New-ChildIssue -ParentId $e5.id -Title "Build received items list with copy and download actions" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Items render newest first via poll loop`n- [ ] Text items: preview + Copy (Clipboard API)`n- [ ] File items: name, size, Download button`n- [ ] Subtle new-item pulse on arrival (respect prefers-reduced-motion)`n`n## Spec refs`n- specs/04-mvp-spec.md §5`n- specs/10-ui-ux.md §2-3`n- specs/12-mvp-build-checklist.md §4-5"
$issues.i5_4 = New-ChildIssue -ParentId $e5.id -Title "Implement connection status bar and poll loop with Page Visibility" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Status dot + label: grey=unpaired, amber=waiting, green=paired, red=lost`n- [ ] Poll ~2s when tab focused; backoff when blurred; pause when hidden`n- [ ] Clear empty states and actionable error toasts`n- [ ] State machine: UNPAIRED → WAITING → PAIRED → EXPIRED`n`n## Spec refs`n- specs/10-ui-ux.md §1-3, §6`n- specs/05-data-flow.md §5`n- specs/12-mvp-build-checklist.md §6"

# Epic 6
$issues.i6_1 = New-ChildIssue -ParentId $e6.id -Title "Render all user content via textContent (no innerHTML)" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Text previews use textContent only`n- [ ] Filenames and metadata escaped on display`n- [ ] No stored XSS via text or filename fields`n`n## Spec refs`n- specs/07-encryption.md §4`n- specs/11-edge-cases.md §4`n- specs/12-mvp-build-checklist.md §6"
$issues.i6_2 = New-ChildIssue -ParentId $e6.id -Title "Enforce per-token item count and byte quotas" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Max items per token enforced with clear error`n- [ ] Max total bytes per token enforced`n- [ ] Single-request upload cap (~25-50MB) until chunked upload lands`n`n## Spec refs`n- specs/07-encryption.md §4`n- specs/11-edge-cases.md §3-4`n- specs/04-mvp-spec.md §4"
$issues.i6_3 = New-ChildIssue -ParentId $e6.id -Title "Rate-limit pairing claim attempts per IP" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Claim endpoint rate-limited per IP (KV counter or CF rate limiting)`n- [ ] High-entropy tokens (~40+ bits) used`n- [ ] Brute-force attempts throttled with sensible limits`n`n## Spec refs`n- specs/07-encryption.md §4`n- specs/11-edge-cases.md §4"
$issues.i6_4 = New-ChildIssue -ParentId $e6.id -Title "Add poll retry backoff and connection-lost messaging" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Intermittent poll failures retry with backoff`n- [ ] UI shows Connection lost — retrying when appropriate`n- [ ] Session persists in KV across reconnects`n`n## Spec refs`n- specs/11-edge-cases.md §1`n- specs/10-ui-ux.md §3"
$issues.i6_5 = New-ChildIssue -ParentId $e6.id -Title "Sanitize filenames and use server-generated R2 keys" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] R2 object keys derived from server itemId, not user filename`n- [ ] Original filename stored as metadata only`n- [ ] Unsafe filename chars handled safely on display`n- [ ] No path traversal in storage keys`n`n## Spec refs`n- specs/11-edge-cases.md §3-4`n- specs/07-encryption.md §4"

# Epic 7
$issues.i7_1 = New-ChildIssue -ParentId $e7.id -Title "Add R2 multipart upload API (init, chunk, complete)" -Labels @("phase-1.5") -Body "## Acceptance criteria`n- [ ] POST /api/{token}/items initiates multipart for large files → { itemId, uploadId }`n- [ ] PUT /api/{token}/items/{itemId}/chunk?part=n streams each ~8MB part`n- [ ] POST /api/{token}/items/{itemId}/complete finalizes upload`n- [ ] Item visible to receiver only after complete`n`n## Spec refs`n- specs/05-data-flow.md §4`n- specs/04-mvp-spec.md §4, §9"
$issues.i7_2 = New-ChildIssue -ParentId $e7.id -Title "Add client chunked upload with per-part retry" -Labels @("phase-1.5") -Body "## Acceptance criteria`n- [ ] Client splits files into ~8MB chunks under 100MB body limit`n- [ ] Failed chunk retries only that part`n- [ ] Upload resumes after transient network errors`n`n## Spec refs`n- specs/05-data-flow.md §4`n- specs/11-edge-cases.md §3"
$issues.i7_3 = New-ChildIssue -ParentId $e7.id -Title "Show upload progress bar for chunked uploads" -Labels @("phase-1.5") -Body "## Acceptance criteria`n- [ ] Per-file progress bar during chunked upload`n- [ ] Progress reflects completed parts vs total`n- [ ] Essential UX per specs/10-ui-ux.md §3`n`n## Spec refs`n- specs/10-ui-ux.md §3`n- specs/06-features-roadmap.md §Phase 1.5"

# Epic 8
$issues.i8_1 = New-ChildIssue -ParentId $e8.id -Title "Add client-side folder zip upload with JSZip" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Folder enumerated via webkitdirectory or drag-drop`n- [ ] Client zips folder with JSZip preserving relative paths`n- [ ] Zip uploaded as single item via existing/chunked transfer`n- [ ] Receiver downloads usable archive`n`n## Spec refs`n- specs/06-features-roadmap.md §2.1`n- specs/03-tech-stack.md §1"
$issues.i8_2 = New-ChildIssue -ParentId $e8.id -Title "Add optional gitignore-style excludes for repo zips" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Skip node_modules, .git, build dirs by default`n- [ ] Optional respect .gitignore if present`n- [ ] Excludes configurable before zip`n`n## Spec refs`n- specs/06-features-roadmap.md §2.1"
$issues.i8_3 = New-ChildIssue -ParentId $e8.id -Title "Add image thumbnail preview on receive" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Image MIME types render thumbnail/preview on receiver`n- [ ] Previews use blob object URLs, not server-rendered HTML`n- [ ] Download still available alongside preview`n`n## Spec refs`n- specs/06-features-roadmap.md §2.2`n- specs/07-encryption.md §4"
$issues.i8_4 = New-ChildIssue -ParentId $e8.id -Title "Add clipboard paste support for images" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] paste event captures image blobs from clipboard`n- [ ] Pasted screenshots queue as file items`n- [ ] Works alongside existing text paste flow`n`n## Spec refs`n- specs/06-features-roadmap.md §2.2`n- specs/10-ui-ux.md §2"
$issues.i8_5 = New-ChildIssue -ParentId $e8.id -Title "Add opt-in TTL history index" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] History list shows recent transfers (text snippets + filenames + timestamps)`n- [ ] Opt-in toggle; default off`n- [ ] History index auto-expires via TTL`n- [ ] Requires encryption (blocked until Epic 9 lands)`n`n## Spec refs`n- specs/06-features-roadmap.md §2.3`n- specs/11-edge-cases.md §5`n- specs/07-encryption.md §1"

# Epic 9
$issues.i9_1 = New-ChildIssue -ParentId $e9.id -Title "Implement AES-GCM encrypt-before-upload in browser" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Random symmetric key generated via Web Crypto API`n- [ ] Payloads encrypted with AES-GCM before POST upload`n- [ ] Server stores ciphertext + IV + algorithm tag only`n- [ ] Worker remains a dumb pipe (no server-side crypto)`n`n## Spec refs`n- specs/07-encryption.md §2-3"
$issues.i9_2 = New-ChildIssue -ParentId $e9.id -Title "Share encryption key via URL fragment and copy button" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Key never sent to server (URL fragment #key=...)`n- [ ] Copy button shares key out-of-band to other device`n- [ ] Pair token (routing) and key (crypto) kept separate`n`n## Spec refs`n- specs/07-encryption.md §2B, §3"
$issues.i9_3 = New-ChildIssue -ParentId $e9.id -Title "Add optional passphrase-derived key mode" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Both devices can enter shared passphrase`n- [ ] Key derived via PBKDF2 (Web Crypto)`n- [ ] Optional alternative when key paste is impractical`n`n## Spec refs`n- specs/07-encryption.md §2C, §3"
$issues.i9_4 = New-ChildIssue -ParentId $e9.id -Title "Decrypt ciphertext after download on receiver" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Receiver decrypts after download using shared key`n- [ ] Encrypted format versioned for future evolution`n- [ ] Plaintext only in browser memory after decrypt`n`n## Spec refs`n- specs/07-encryption.md §3`n- specs/01-goals-and-scope.md §2"

# Epic 10
$issues.i10_1 = New-ChildIssue -ParentId $e10.id -Title "Store context buffer in IndexedDB with folder tree UI" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Files read into browser via FileReader / directory input`n- [ ] Buffer persisted in IndexedDB (survives refresh)`n- [ ] Folder structure shown as expandable tree`n- [ ] Per-file remove (×) control`n`n## Spec refs`n- specs/08-prompt-mode.md §3.1, §5`n- specs/10-ui-ux.md §4"
$issues.i10_2 = New-ChildIssue -ParentId $e10.id -Title "Implement replace-by-name on re-drop with prompt" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Matching relative path triggers Replace / Keep both / Cancel prompt`n- [ ] Optional auto-replace matching names toggle`n- [ ] Updated timestamp indicator on replaced files`n- [ ] Default-skip noise dirs (node_modules, .git, etc.)`n`n## Spec refs`n- specs/08-prompt-mode.md §3.2-3.3"
$issues.i10_3 = New-ChildIssue -ParentId $e10.id -Title "Add formatted copy output with token size estimate" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Copy serializes buffer to chat-context format (tree + fenced blocks)`n- [ ] Language inferred from file extension`n- [ ] Binary files marked [binary omitted]`n- [ ] Live token estimate (chars ÷ ~4)`n- [ ] Download as .md/.txt option`n`n## Spec refs`n- specs/08-prompt-mode.md §3.4-3.5"
$issues.i10_4 = New-ChildIssue -ParentId $e10.id -Title "Add optional push buffer to other PC via transfer channel" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Push buffer action zips buffer and sends via transfer API`n- [ ] Receiver can import buffer on other device`n- [ ] Reuses Phase 1/2 transfer plumbing`n`n## Spec refs`n- specs/08-prompt-mode.md §4"

# Epic 11
$issues.i11_1 = New-ChildIssue -ParentId $e11.id -Title "Evaluate and implement WebRTC P2P fast path with relay fallback" -Labels @("future") -Body "## Acceptance criteria`n- [ ] Pair via existing token; attempt WebRTC data channel`n- [ ] Auto-fallback to relay if P2P fails within timeout`n- [ ] Relay remains default; P2P is opportunistic only`n- [ ] Only pursued when relay limits bite AND work-network P2P confirmed`n`n## Spec refs`n- specs/09-webrtc-alternative.md`n- specs/06-features-roadmap.md parking lot"
$issues.i11_2 = New-ChildIssue -ParentId $e11.id -Title "Evaluate and implement Durable Object WebSocket presence" -Labels @("future") -Body "## Acceptance criteria`n- [ ] Real-time push replaces polling when implemented`n- [ ] Presence indicator (other PC is here)`n- [ ] Polling remains fallback`n- [ ] Only pursued as UX nicety after core relay stable`n`n## Spec refs`n- specs/02-architecture.md §2`n- specs/06-features-roadmap.md parking lot"

Write-Host "Child issues created. Creating sub-issues for >1-day items..."

# Sub-issues (>1 day work)
$issues.i5_1a = New-SubIssue -ParentId $issues.i5_1.id -Title "Add initiator pairing view with token display" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Start button calls POST /api/pair`n- [ ] Large monospace token display`n- [ ] Copy token button uses Clipboard API`n- [ ] Waiting for other device status shown`n`n## Parent`nPairing UI epic child"
$issues.i5_1b = New-SubIssue -ParentId $issues.i5_1.id -Title "Add joiner pairing view with token input" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Token input field with unambiguous charset validation`n- [ ] Connect button calls POST /api/pair/{token}/claim`n- [ ] Clear errors for typo/expired/already-claimed tokens`n`n## Parent`nPairing UI epic child"
$issues.i5_1c = New-SubIssue -ParentId $issues.i5_1.id -Title "Wire pairing views to status polling until Paired" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Both views poll GET /api/{token}/status until paired`n- [ ] Transition to paired workspace on success`n- [ ] Handle expired token during wait`n`n## Parent`nPairing UI epic child"

$issues.i5_2a = New-SubIssue -ParentId $issues.i5_2.id -Title "Add text send area with textarea and Send button" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Textarea + Send posts to POST /api/{token}/items`n- [ ] Ctrl/Cmd+Enter sends text`n- [ ] Textarea clears after successful send`n`n## Parent`nSend workspace epic child"
$issues.i5_2b = New-SubIssue -ParentId $issues.i5_2.id -Title "Add drag-drop file zone with whole-window target" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] Drop zone highlights on drag-over when paired`n- [ ] Shows file count + total size before upload`n- [ ] Uploads each file via transfer API`n`n## Parent`nSend workspace epic child"
$issues.i5_2c = New-SubIssue -ParentId $issues.i5_2.id -Title "Add file picker fallback input" -Labels @("mvp") -Body "## Acceptance criteria`n- [ ] input type=file multiple as fallback`n- [ ] Same upload path as drag-drop`n- [ ] Works when drag-drop unavailable`n`n## Parent`nSend workspace epic child"

$issues.i8_1a = New-SubIssue -ParentId $issues.i8_1.id -Title "Enumerate folder files via webkitdirectory" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] webkitdirectory input enumerates all files with relative paths`n- [ ] Drag-drop folder supported where browser allows`n- [ ] Graceful fallback note if unsupported (specs/11-edge-cases.md §6)`n`n## Parent`nFolder zip epic child"
$issues.i8_1b = New-SubIssue -ParentId $issues.i8_1.id -Title "Zip enumerated folder client-side with JSZip" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] JSZip packages folder preserving relative paths`n- [ ] Zip uploaded as single transfer item`n- [ ] Uses chunked upload when zip exceeds single-request limit`n`n## Parent`nFolder zip epic child"

$issues.i10_1a = New-SubIssue -ParentId $issues.i10_1.id -Title "Implement IndexedDB buffer storage layer" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Buffer read/write/clear in IndexedDB`n- [ ] Survives page refresh`n- [ ] Clear buffer wipes workspace data`n`n## Spec refs`n- specs/08-prompt-mode.md §5"
$issues.i10_1b = New-SubIssue -ParentId $issues.i10_1.id -Title "Build folder tree UI component for context buffer" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Expandable tree by relative path`n- [ ] Per-file remove control`n- [ ] Two-pane layout shell (buffer left)`n`n## Spec refs`n- specs/08-prompt-mode.md §2, §10-ui-ux.md §4"
$issues.i10_1c = New-SubIssue -ParentId $issues.i10_1.id -Title "Read dropped files and folders into buffer" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Drag-drop files/folders into buffer pane`n- [ ] FileReader reads contents into memory/IndexedDB`n- [ ] Warn before reading huge repos; offer excludes first`n`n## Spec refs`n- specs/08-prompt-mode.md §3.1, §6"

$issues.i10_3a = New-SubIssue -ParentId $issues.i10_3.id -Title "Implement chat-context formatter with fenced code blocks" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Optional header + file tree summary`n- [ ] Each file: path heading + fenced block with inferred language`n- [ ] Binary files marked [binary omitted]`n`n## Spec refs`n- specs/08-prompt-mode.md §3.4"
$issues.i10_3b = New-SubIssue -ParentId $issues.i10_3.id -Title "Add copy-to-clipboard and download formatted output" -Labels @("phase-3") -Body "## Acceptance criteria`n- [ ] Copy button writes formatted blob to clipboard`n- [ ] Download as .md/.txt option`n- [ ] Live token estimate displayed`n`n## Spec refs`n- specs/08-prompt-mode.md §3.4-3.5"

$issues.i9_1a = New-SubIssue -ParentId $issues.i9_1.id -Title "Encrypt text and file payloads before upload" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] AES-GCM via Web Crypto before POST /items`n- [ ] IV + ciphertext + tag stored together`n- [ ] Format version field for evolution`n`n## Spec refs`n- specs/07-encryption.md §3"
$issues.i9_1b = New-SubIssue -ParentId $issues.i9_1.id -Title "Handle encrypted metadata in item index" -Labels @("phase-2") -Body "## Acceptance criteria`n- [ ] Item metadata indicates encrypted flag + algorithm version`n- [ ] Server cannot read payload contents`n- [ ] Compatible with existing poll/download flow`n`n## Spec refs`n- specs/07-encryption.md §3"

Write-Host "Setting dependencies..."

# --- DEPENDENCIES (build order) ---
# Epic 1 chain
Add-BlockedBy -BlockedId $issues.i1_2.id -BlockerId $issues.i1_1.id
Add-BlockedBy -BlockedId $issues.i1_3.id -BlockerId $issues.i1_2.id

# Epic 2 chain
Add-BlockedBy -BlockedId $issues.i2_1.id -BlockerId $issues.i1_2.id
Add-BlockedBy -BlockedId $issues.i2_2.id -BlockerId $issues.i2_1.id
Add-BlockedBy -BlockedId $issues.i2_3.id -BlockerId $issues.i2_2.id
Add-BlockedBy -BlockedId $issues.i2_4.id -BlockerId $issues.i2_2.id
Add-BlockedBy -BlockedId $issues.i2_5.id -BlockerId $issues.i2_3.id

# Epic 3
Add-BlockedBy -BlockedId $issues.i3_1.id -BlockerId $issues.i2_2.id
Add-BlockedBy -BlockedId $issues.i3_2.id -BlockerId $issues.i3_1.id
Add-BlockedBy -BlockedId $issues.i3_3.id -BlockerId $issues.i3_2.id

# Epic 4
Add-BlockedBy -BlockedId $issues.i4_1.id -BlockerId $issues.i3_2.id
Add-BlockedBy -BlockedId $issues.i4_2.id -BlockerId $issues.i4_1.id
Add-BlockedBy -BlockedId $issues.i4_3.id -BlockerId $issues.i4_1.id
Add-BlockedBy -BlockedId $issues.i4_4.id -BlockerId $issues.i4_3.id

# Epic 5
Add-BlockedBy -BlockedId $issues.i5_1.id -BlockerId $issues.i3_3.id
Add-BlockedBy -BlockedId $issues.i5_2.id -BlockerId $issues.i4_1.id
Add-BlockedBy -BlockedId $issues.i5_3.id -BlockerId $issues.i4_2.id
Add-BlockedBy -BlockedId $issues.i5_3.id -BlockerId $issues.i4_4.id
Add-BlockedBy -BlockedId $issues.i5_4.id -BlockerId $issues.i5_1.id

# Epic 5 sub-issues
Add-BlockedBy -BlockedId $issues.i5_1b.id -BlockerId $issues.i5_1a.id
Add-BlockedBy -BlockedId $issues.i5_1c.id -BlockerId $issues.i5_1a.id
Add-BlockedBy -BlockedId $issues.i5_1c.id -BlockerId $issues.i5_1b.id
Add-BlockedBy -BlockedId $issues.i5_2b.id -BlockerId $issues.i5_2a.id
Add-BlockedBy -BlockedId $issues.i5_2c.id -BlockerId $issues.i5_2a.id

# Epic 6 (after core API + UI foundations)
Add-BlockedBy -BlockedId $issues.i6_1.id -BlockerId $issues.i5_3.id
Add-BlockedBy -BlockedId $issues.i6_2.id -BlockerId $issues.i4_3.id
Add-BlockedBy -BlockedId $issues.i6_3.id -BlockerId $issues.i3_2.id
Add-BlockedBy -BlockedId $issues.i6_4.id -BlockerId $issues.i5_4.id
Add-BlockedBy -BlockedId $issues.i6_5.id -BlockerId $issues.i4_3.id

# Epic 7 (after MVP transfer API)
Add-BlockedBy -BlockedId $issues.i7_1.id -BlockerId $issues.i4_3.id
Add-BlockedBy -BlockedId $issues.i7_2.id -BlockerId $issues.i7_1.id
Add-BlockedBy -BlockedId $issues.i7_3.id -BlockerId $issues.i7_2.id

# Epic 8 (after chunked upload for large zips)
Add-BlockedBy -BlockedId $issues.i8_1.id -BlockerId $issues.i7_1.id
Add-BlockedBy -BlockedId $issues.i8_1b.id -BlockerId $issues.i8_1a.id
Add-BlockedBy -BlockedId $issues.i8_2.id -BlockerId $issues.i8_1.id
Add-BlockedBy -BlockedId $issues.i8_3.id -BlockerId $issues.i5_3.id
Add-BlockedBy -BlockedId $issues.i8_4.id -BlockerId $issues.i8_3.id
Add-BlockedBy -BlockedId $issues.i8_5.id -BlockerId $issues.i9_1.id

# Epic 9 (after MVP complete)
Add-BlockedBy -BlockedId $issues.i9_1.id -BlockerId $issues.i4_4.id
Add-BlockedBy -BlockedId $issues.i9_1b.id -BlockerId $issues.i9_1a.id
Add-BlockedBy -BlockedId $issues.i9_2.id -BlockerId $issues.i9_1.id
Add-BlockedBy -BlockedId $issues.i9_3.id -BlockerId $issues.i9_1.id
Add-BlockedBy -BlockedId $issues.i9_4.id -BlockerId $issues.i9_1.id

# Epic 10 (after Phase 2 folder work)
Add-BlockedBy -BlockedId $issues.i10_1.id -BlockerId $issues.i8_1.id
Add-BlockedBy -BlockedId $issues.i10_1b.id -BlockerId $issues.i10_1a.id
Add-BlockedBy -BlockedId $issues.i10_1c.id -BlockerId $issues.i10_1a.id
Add-BlockedBy -BlockedId $issues.i10_2.id -BlockerId $issues.i10_1.id
Add-BlockedBy -BlockedId $issues.i10_3.id -BlockerId $issues.i10_1.id
Add-BlockedBy -BlockedId $issues.i10_3b.id -BlockerId $issues.i10_3a.id
Add-BlockedBy -BlockedId $issues.i10_4.id -BlockerId $issues.i10_1.id
Add-BlockedBy -BlockedId $issues.i10_4.id -BlockerId $issues.i7_1.id

# Epic 11 (future, after stable relay)
Add-BlockedBy -BlockedId $issues.i11_1.id -BlockerId $issues.i7_1.id
Add-BlockedBy -BlockedId $issues.i11_2.id -BlockerId $issues.i5_4.id

Write-Host "Adding blocked-by notes and ready labels..."

# blocked-by notes + ready labels
$depMap = @{
    $issues.i1_1.number = @()
    $issues.i1_2.number = @($issues.i1_1.number)
    $issues.i1_3.number = @($issues.i1_2.number)
    $issues.i2_1.number = @($issues.i1_2.number)
    $issues.i2_2.number = @($issues.i2_1.number)
    $issues.i2_3.number = @($issues.i2_2.number)
    $issues.i2_4.number = @($issues.i2_2.number)
    $issues.i2_5.number = @($issues.i2_3.number)
    $issues.i3_1.number = @($issues.i2_2.number)
    $issues.i3_2.number = @($issues.i3_1.number)
    $issues.i3_3.number = @($issues.i3_2.number)
    $issues.i4_1.number = @($issues.i3_2.number)
    $issues.i4_2.number = @($issues.i4_1.number)
    $issues.i4_3.number = @($issues.i4_1.number)
    $issues.i4_4.number = @($issues.i4_3.number)
    $issues.i5_1.number = @($issues.i3_3.number)
    $issues.i5_2.number = @($issues.i4_1.number)
    $issues.i5_3.number = @($issues.i4_2.number, $issues.i4_4.number)
    $issues.i5_4.number = @($issues.i5_1.number)
    $issues.i5_1a.number = @($issues.i3_3.number)
    $issues.i5_1b.number = @($issues.i5_1a.number)
    $issues.i5_1c.number = @($issues.i5_1a.number, $issues.i5_1b.number)
    $issues.i5_2a.number = @($issues.i4_1.number)
    $issues.i5_2b.number = @($issues.i5_2a.number)
    $issues.i5_2c.number = @($issues.i5_2a.number)
    $issues.i6_1.number = @($issues.i5_3.number)
    $issues.i6_2.number = @($issues.i4_3.number)
    $issues.i6_3.number = @($issues.i3_2.number)
    $issues.i6_4.number = @($issues.i5_4.number)
    $issues.i6_5.number = @($issues.i4_3.number)
    $issues.i7_1.number = @($issues.i4_3.number)
    $issues.i7_2.number = @($issues.i7_1.number)
    $issues.i7_3.number = @($issues.i7_2.number)
    $issues.i8_1.number = @($issues.i7_1.number)
    $issues.i8_1a.number = @($issues.i7_1.number)
    $issues.i8_1b.number = @($issues.i8_1a.number)
    $issues.i8_2.number = @($issues.i8_1.number)
    $issues.i8_3.number = @($issues.i5_3.number)
    $issues.i8_4.number = @($issues.i8_3.number)
    $issues.i8_5.number = @($issues.i9_1.number)
    $issues.i9_1.number = @($issues.i4_4.number)
    $issues.i9_1a.number = @($issues.i4_4.number)
    $issues.i9_1b.number = @($issues.i9_1a.number)
    $issues.i9_2.number = @($issues.i9_1.number)
    $issues.i9_3.number = @($issues.i9_1.number)
    $issues.i9_4.number = @($issues.i9_1.number)
    $issues.i10_1.number = @($issues.i8_1.number)
    $issues.i10_1a.number = @($issues.i8_1.number)
    $issues.i10_1b.number = @($issues.i10_1a.number)
    $issues.i10_1c.number = @($issues.i10_1a.number)
    $issues.i10_2.number = @($issues.i10_1.number)
    $issues.i10_3.number = @($issues.i10_1.number)
    $issues.i10_3a.number = @($issues.i10_1.number)
    $issues.i10_3b.number = @($issues.i10_3a.number)
    $issues.i10_4.number = @($issues.i10_1.number, $issues.i7_1.number)
    $issues.i11_1.number = @($issues.i7_1.number)
    $issues.i11_2.number = @($issues.i5_4.number)
}

foreach ($entry in $depMap.GetEnumerator()) {
    Set-BlockedByNote -Number $entry.Key -Blockers $entry.Value
    if ($entry.Value.Count -eq 0) {
        Mark-Ready -Number $entry.Key
    }
}

Write-Host "Done. Epics: $($e1.number)-$($e11.number). First ready issue: #$($issues.i1_1.number)"

# Output summary JSON for verification
@{
    epics = @($e1, $e2, $e3, $e4, $e5, $e6, $e7, $e8, $e9, $e10, $e11)
    firstReady = $issues.i1_1.number
} | ConvertTo-Json -Depth 3
