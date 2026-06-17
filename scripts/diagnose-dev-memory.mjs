/**
 * Snapshot node/postcss worker memory for relaypad dev debugging.
 * Run while `next dev` is active: node scripts/diagnose-dev-memory.mjs
 */
import { appendFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "debug-7c9114.log");
const SESSION_ID = "7c9114";
const PROJECT_MARKER = "programs\\peer";

function log(hypothesisId, message, data) {
	const entry = {
		sessionId: SESSION_ID,
		runId: "diagnose",
		hypothesisId,
		location: "scripts/diagnose-dev-memory.mjs",
		message,
		data,
		timestamp: Date.now(),
	};
	appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
	console.log(JSON.stringify(entry, null, 2));
}

function getNodeProcesses() {
	const raw = execSync(
		'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Select-Object ProcessId, ParentProcessId, CommandLine, WorkingSetSize | ConvertTo-Json -Compress"',
		{ encoding: "utf8" },
	);
	const parsed = JSON.parse(raw || "[]");
	return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
}

const processes = getNodeProcesses();
const postcssWorkers = processes.filter((p) => (p.CommandLine || "").includes("postcss.js"));
const peerProcesses = processes.filter((p) => (p.CommandLine || "").includes(PROJECT_MARKER));
const totalMemMb = Math.round(processes.reduce((sum, p) => sum + (p.WorkingSetSize || 0), 0) / 1024 / 1024);
const postcssMemMb = Math.round(postcssWorkers.reduce((sum, p) => sum + (p.WorkingSetSize || 0), 0) / 1024 / 1024);

const parentCounts = {};
for (const worker of postcssWorkers) {
	const parent = String(worker.ParentProcessId ?? "unknown");
	parentCounts[parent] = (parentCounts[parent] ?? 0) + 1;
}

log("A", "postcss worker snapshot", {
	postcssWorkerCount: postcssWorkers.length,
	postcssMemMb,
	totalNodeProcesses: processes.length,
	totalNodeMemMb: totalMemMb,
	peerRelatedNodeProcesses: peerProcesses.length,
	parentProcessCounts: parentCounts,
	sampleCommandLines: postcssWorkers.slice(0, 3).map((p) => p.CommandLine),
});

const homeLock = "C:\\Users\\skinn\\package-lock.json";
const homePkg = "C:\\Users\\skinn\\package.json";
const homeNodeModules = "C:\\Users\\skinn\\node_modules";
log("B", "ancestor lockfile check", {
	homeHasPackageLock: existsSync(homeLock),
	homeHasPackageJson: existsSync(homePkg),
	homeHasNodeModules: existsSync(homeNodeModules),
	projectPath: join(dirname(fileURLToPath(import.meta.url)), ".."),
});
