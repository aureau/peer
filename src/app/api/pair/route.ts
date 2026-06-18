import {
	createPair,
	getAccessToken,
	getSessionView,
	getStorageBindings,
} from "@/lib/storage";

export async function POST() {
	let sessionKey: string;
	try {
		sessionKey = getAccessToken();
	} catch {
		return Response.json(
			{ error: "CONFIG_ERROR", message: "ACCESS_TOKEN is not configured" },
			{ status: 500 },
		);
	}

	const bindings = getStorageBindings();
	const record = await createPair(bindings, sessionKey, "waiting");
	const view = getSessionView(record);

	return Response.json({
		key: sessionKey,
		status: view.status,
		expiresIn: view.expiresIn,
	});
}
