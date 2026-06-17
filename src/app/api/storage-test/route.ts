import { getCloudflareContext } from "@opennextjs/cloudflare";

const TEST_KEY = "__relaypad_kv_test__";

export async function GET() {
	const { env } = getCloudflareContext();
	const written = new Date().toISOString();

	await env.KV.put(TEST_KEY, written);
	const read = await env.KV.get(TEST_KEY);

	return Response.json({ ok: true, written, read });
}
