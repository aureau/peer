import type { StorageBindings } from "./env";
import { r2ObjectKey } from "./keys";

type PutR2Options = {
	contentType?: string;
	contentLength?: number;
};

export async function putR2Object(
	bindings: StorageBindings,
	sessionKey: string,
	itemId: string,
	body: string | ArrayBuffer | ReadableStream,
	options?: PutR2Options,
): Promise<string> {
	const key = r2ObjectKey(sessionKey, itemId);
	const putOptions: R2PutOptions = options?.contentType
		? { httpMetadata: { contentType: options.contentType } }
		: {};

	if (body instanceof ReadableStream) {
		if (options?.contentLength === undefined) {
			throw new Error("contentLength is required when uploading a ReadableStream to R2");
		}

		const FixedLength =
			"FixedLengthStream" in globalThis
				? (globalThis as unknown as { FixedLengthStream: typeof FixedLengthStream }).FixedLengthStream
				: undefined;
		if (FixedLength) {
			const fixed = new FixedLength(options.contentLength);
			await Promise.all([
				bindings.R2.put(key, fixed.readable, putOptions),
				body.pipeTo(fixed.writable),
			]);
			return key;
		}

		// next dev (node): no FixedLengthStream — buffer for local testing only
		const buffer = await new Response(body).arrayBuffer();
		await bindings.R2.put(key, buffer, putOptions);
		return key;
	}

	await bindings.R2.put(key, body, Object.keys(putOptions).length > 0 ? putOptions : undefined);
	return key;
}

export async function getR2Object(
	bindings: StorageBindings,
	r2key: string,
): Promise<R2ObjectBody | null> {
	return bindings.R2.get(r2key);
}

export async function deleteR2Objects(
	bindings: StorageBindings,
	keys: string[],
): Promise<void> {
	if (keys.length === 0) return;
	await bindings.R2.delete(keys);
}
