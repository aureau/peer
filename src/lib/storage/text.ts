import { TEXT_INLINE_MAX_BYTES } from "./constants";
import type { StorageBindings } from "./env";
import { textKey } from "./keys";
import { appendItem } from "./items";
import { putR2Object } from "./r2";
import { generateItemId } from "./ids";
import { sessionTtlForRecord } from "./session";
import { requireActiveSender } from "./access";
import type { PeerRole, StoreTextResult } from "./types";

function textByteLength(content: string): number {
	return new TextEncoder().encode(content).byteLength;
}

export async function storeText(
	bindings: StorageBindings,
	sessionKey: string,
	content: string,
	peerRole: PeerRole,
): Promise<StoreTextResult> {
	const record = await requireActiveSender(bindings, sessionKey, peerRole, { rollTtl: true });
	const expirationTtl = sessionTtlForRecord(record);
	const itemId = generateItemId();
	const size = textByteLength(content);
	const inline = size <= TEXT_INLINE_MAX_BYTES;

	if (inline) {
		await bindings.KV.put(textKey(sessionKey, itemId), content, expirationTtl ? { expirationTtl } : undefined);
		const item = await appendItem(
			bindings,
			sessionKey,
			{ itemId, type: "text", size },
			expirationTtl,
		);
		return { item, inline: true };
	}

	const r2key = await putR2Object(bindings, sessionKey, itemId, content, {
		contentType: "text/plain; charset=utf-8",
	});
	const item = await appendItem(
		bindings,
		sessionKey,
		{ itemId, type: "text", size, r2key },
		expirationTtl,
	);
	return { item, inline: false };
}

export async function getTextContent(
	bindings: StorageBindings,
	sessionKey: string,
	itemId: string,
	r2key?: string,
): Promise<string | null> {
	if (r2key) {
		const object = await bindings.R2.get(r2key);
		return object ? await object.text() : null;
	}
	return bindings.KV.get(textKey(sessionKey, itemId));
}
