import type { StorageBindings } from "./env";
import { r2ObjectKey } from "./keys";

export async function putR2Object(
	bindings: StorageBindings,
	sessionKey: string,
	itemId: string,
	body: string | ArrayBuffer | ReadableStream,
	contentType?: string,
): Promise<string> {
	const key = r2ObjectKey(sessionKey, itemId);
	await bindings.R2.put(key, body, contentType ? { httpMetadata: { contentType } } : undefined);
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
