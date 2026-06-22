import {
	createPair,
	getAccessToken,
	getSessionView,
	getStorageBindings,
	kvQuotaExceededResponse,
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
	try {
		const record = await createPair(bindings, sessionKey, "waiting");
		const view = getSessionView(record);

		return Response.json({
			key: sessionKey,
			status: view.status,
			expiresIn: view.expiresIn,
		});
	} catch (error) {
		const quota = kvQuotaExceededResponse(error);
		if (quota) return quota;
		throw error;
	}
}
