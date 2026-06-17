import { getStorageBindings, wipeSession } from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string }> };

export async function POST(_request: Request, context: RouteContext) {
	const { key } = await context.params;
	const bindings = getStorageBindings();

	await wipeSession(bindings, key);

	return Response.json({ ok: true });
}
