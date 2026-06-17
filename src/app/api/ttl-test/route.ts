import {
	createPair,
	getPair,
	getSessionView,
	getStorageBindings,
	requirePairedSession,
	SessionError,
	sessionErrorResponse,
	UNCLAIMED_TTL_SECONDS,
} from "@/lib/storage";

const SESSION_KEY = "__relaypad_ttl_test__";

export async function GET(request: Request) {
	const bindings = getStorageBindings();
	const action = new URL(request.url).searchParams.get("action");

	if (action === "reject") {
		try {
			await requirePairedSession(bindings, "__relaypad_missing_session__");
			return Response.json({ ok: false, message: "expected rejection" }, { status: 500 });
		} catch (error) {
			if (error instanceof SessionError) {
				return sessionErrorResponse(error);
			}
			throw error;
		}
	}

	await createPair(bindings, SESSION_KEY, "waiting");
	const waiting = getSessionView(await getPair(bindings, SESSION_KEY));

	return Response.json({
		ok: true,
		waiting: {
			status: waiting.status,
			expiresIn: waiting.expiresIn,
			ttlSeconds: UNCLAIMED_TTL_SECONDS,
		},
		note: "add ?action=reject to verify expired-session api guard",
	});
}
