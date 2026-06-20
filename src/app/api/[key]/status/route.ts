import {
	getPair,
	getSessionView,
	getStorageBindings,
	touchSession,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: Request, context: RouteContext) {
	const { key } = await context.params;
	const bindings = getStorageBindings();

	let record = await getPair(bindings, key);
	if (!record) {
		return Response.json({ status: "unpaired", expiresIn: 0 });
	}

	const initial = getSessionView(record);
	if (initial.status === "expired") {
		return Response.json({ status: "expired", expiresIn: 0 });
	}

	// keep paired sessions alive while either device polls
	if (record.status === "paired") {
		record = (await touchSession(bindings, key)) ?? record;
	}

	const view = getSessionView(record);
	if (view.status === "paired") {
		return Response.json({
			status: view.status,
			expiresIn: view.expiresIn,
			activeSender: record.activeSender,
			receiveSinceSeq: record.receiveSinceSeq,
		});
	}

	return Response.json({
		status: view.status,
		expiresIn: view.expiresIn,
	});
}
