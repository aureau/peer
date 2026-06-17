/** kv key for session pairing state — holds status, created, lastActive */
export function pairKey(sessionKey: string): string {
	return `pair:${sessionKey}`;
}

/** kv key for ordered item index — holds seq, type, metadata, r2key (not session status) */
export function itemsKey(sessionKey: string): string {
	return `items:${sessionKey}`;
}

/** kv key for small inline text payloads */
export function textKey(sessionKey: string, itemId: string): string {
	return `text:${sessionKey}:${itemId}`;
}

/** r2 object key — server-generated item id only, never raw filenames */
export function r2ObjectKey(sessionKey: string, itemId: string): string {
	return `${sessionKey}/${itemId}`;
}
