import { requirePairedSession } from "./access";
import type { StorageBindings } from "./env";
import { getItemIndex, listItemsSince } from "./items";
import { getTextContent } from "./text";
import type { PollItem } from "./types";

/** read-only poll — no kv/r2 writes, no ttl roll */
export async function pollItems(
	bindings: StorageBindings,
	sessionKey: string,
	cursor: number,
): Promise<PollItem[]> {
	await requirePairedSession(bindings, sessionKey, { rollTtl: false });
	const index = await getItemIndex(bindings, sessionKey);
	const entries = listItemsSince(index, cursor);

	return Promise.all(
		entries.map(async (entry) => {
			const item: PollItem = {
				itemId: entry.itemId,
				type: entry.type,
				seq: entry.seq,
				size: entry.size,
				name: entry.name,
				mime: entry.mime,
				relativePath: entry.relativePath,
			};

			if (entry.type === "text") {
				item.content =
					(await getTextContent(bindings, sessionKey, entry.itemId, entry.r2key)) ?? "";
			}

			return item;
		}),
	);
}
