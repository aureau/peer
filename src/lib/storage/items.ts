import type { StorageBindings } from "./env";
import { itemsKey, textKey } from "./keys";
import type { ItemIndex, ItemIndexEntry } from "./types";

const EMPTY_INDEX: ItemIndex = { items: [], nextSeq: 0 };

export async function getItemIndex(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<ItemIndex> {
	const raw = await bindings.KV.get(itemsKey(sessionKey), "json");
	return (raw as ItemIndex | null) ?? { ...EMPTY_INDEX, items: [] };
}

async function putItemIndex(
	bindings: StorageBindings,
	sessionKey: string,
	index: ItemIndex,
	expirationTtl?: number,
): Promise<void> {
	const options = expirationTtl ? { expirationTtl } : undefined;
	await bindings.KV.put(itemsKey(sessionKey), JSON.stringify(index), options);
}

export async function refreshItemIndexTtl(
	bindings: StorageBindings,
	sessionKey: string,
	expirationTtl: number,
): Promise<void> {
	const index = await getItemIndex(bindings, sessionKey);
	if (index.items.length === 0 && index.nextSeq === 0) return;
	await putItemIndex(bindings, sessionKey, index, expirationTtl);
}

export async function appendItem(
	bindings: StorageBindings,
	sessionKey: string,
	entry: Omit<ItemIndexEntry, "seq">,
	expirationTtl?: number,
): Promise<ItemIndexEntry> {
	const index = await getItemIndex(bindings, sessionKey);
	const item: ItemIndexEntry = { ...entry, seq: index.nextSeq };
	index.items.push(item);
	index.nextSeq += 1;
	await putItemIndex(bindings, sessionKey, index, expirationTtl);
	return item;
}

export function listItemsSince(index: ItemIndex, cursor: number): ItemIndexEntry[] {
	return index.items.filter((item) => item.seq > cursor);
}

export function findItemById(index: ItemIndex, itemId: string): ItemIndexEntry | undefined {
	return index.items.find((item) => item.itemId === itemId);
}

export async function deleteItemIndex(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<void> {
	await bindings.KV.delete(itemsKey(sessionKey));
}

export async function deleteInlineTextKeys(
	bindings: StorageBindings,
	sessionKey: string,
	items: ItemIndexEntry[],
): Promise<void> {
	const deletes = items
		.filter((item) => item.type === "text" && !item.r2key)
		.map((item) => bindings.KV.delete(textKey(sessionKey, item.itemId)));
	await Promise.all(deletes);
}
