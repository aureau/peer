import {
	createPair,
	getR2Object,
	getStorageBindings,
	putR2Object,
	sweepOrphanedR2Objects,
	wipeSession,
} from "@/lib/storage";

const ORPHAN_SESSION_A = "__relaypad_sweep_test_orphan_a__";
const ORPHAN_SESSION_B = "__relaypad_sweep_test_orphan_b__";
const LIVE_SESSION = "__relaypad_sweep_test_live__";

export async function GET() {
	const bindings = getStorageBindings();

	const orphanKeyA = await putR2Object(
		bindings,
		ORPHAN_SESSION_A,
		"orphan-a",
		"orphan payload a",
	);
	const orphanKeyB = await putR2Object(
		bindings,
		ORPHAN_SESSION_B,
		"orphan-b",
		"orphan payload b",
	);

	await createPair(bindings, LIVE_SESSION, "paired");
	const liveKey = await putR2Object(bindings, LIVE_SESSION, "live-item", "live payload");

	const before = {
		orphanA: !!(await getR2Object(bindings, orphanKeyA)),
		orphanB: !!(await getR2Object(bindings, orphanKeyB)),
		live: !!(await getR2Object(bindings, liveKey)),
	};

	const sweep = await sweepOrphanedR2Objects(bindings);

	const after = {
		orphanA: !!(await getR2Object(bindings, orphanKeyA)),
		orphanB: !!(await getR2Object(bindings, orphanKeyB)),
		live: !!(await getR2Object(bindings, liveKey)),
	};

	await wipeSession(bindings, LIVE_SESSION);

	const ok =
		before.orphanA &&
		before.orphanB &&
		before.live &&
		!after.orphanA &&
		!after.orphanB &&
		after.live;

	return Response.json({
		ok,
		sweep,
		before,
		after,
		keys: { orphanKeyA, orphanKeyB, liveKey },
	});
}
