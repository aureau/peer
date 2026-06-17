import { deleteInlineTextKeys, deleteItemIndex, getItemIndex } from "./items";
import { pairKey } from "./keys";
import { deleteR2Objects } from "./r2";
import type { StorageBindings } from "./env";

async function deleteR2SessionObjects(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<void> {
	const prefix = `${sessionKey}/`;
	let cursor: string | undefined;

	do {
		const listed = await bindings.R2.list({ prefix, cursor });
		const keys = listed.objects.map((object) => object.key);
		if (keys.length > 0) {
			await deleteR2Objects(bindings, keys);
		}
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
}

/** delete all kv metadata and r2 objects for a session */
export async function wipeSession(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<void> {
	const index = await getItemIndex(bindings, sessionKey);
	const r2keys = index.items.flatMap((item) => (item.r2key ? [item.r2key] : []));

	await Promise.all([
		deleteInlineTextKeys(bindings, sessionKey, index.items),
		deleteR2Objects(bindings, r2keys),
		deleteR2SessionObjects(bindings, sessionKey),
		deleteItemIndex(bindings, sessionKey),
		bindings.KV.delete(pairKey(sessionKey)),
	]);
}
