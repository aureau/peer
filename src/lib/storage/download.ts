import { requirePairedSession } from "./access";
import type { StorageBindings } from "./env";
import { findItemById, getItemIndex } from "./items";
import { getR2Object } from "./r2";
import { getTextContent } from "./text";
import type { ItemIndexEntry } from "./types";

/** mime types that must not render inline in the browser */
const FORCED_OCTET_STREAM = new Set([
	"text/html",
	"application/javascript",
	"text/javascript",
	"application/xhtml+xml",
	"image/svg+xml",
]);

export type DownloadPayload = {
	body: ReadableStream | string;
	contentType: string;
	contentLength?: number;
	filename: string;
};

function downloadFilename(entry: ItemIndexEntry): string {
	if (entry.name?.trim()) return entry.name.trim();
	return entry.type === "text" ? "text.txt" : "download";
}

export function safeDownloadMime(mime?: string): string {
	if (!mime) return "application/octet-stream";
	const base = mime.toLowerCase().split(";")[0]?.trim();
	if (!base || FORCED_OCTET_STREAM.has(base)) {
		return "application/octet-stream";
	}
	return base;
}

export function contentDispositionAttachment(filename: string): string {
	const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** read-only download — no kv/r2 writes, no ttl roll */
export async function getItemDownload(
	bindings: StorageBindings,
	sessionKey: string,
	itemId: string,
): Promise<DownloadPayload | null> {
	await requirePairedSession(bindings, sessionKey, { rollTtl: false });
	const index = await getItemIndex(bindings, sessionKey);
	const entry = findItemById(index, itemId);
	if (!entry) return null;

	const filename = downloadFilename(entry);

	if (entry.r2key) {
		const object = await getR2Object(bindings, entry.r2key);
		if (!object) return null;

		return {
			body: object.body,
			contentType: safeDownloadMime(entry.mime ?? object.httpMetadata?.contentType),
			contentLength: entry.size ?? object.size,
			filename,
		};
	}

	if (entry.type === "text") {
		const content = await getTextContent(bindings, sessionKey, entry.itemId);
		if (content === null) return null;

		return {
			body: content,
			contentType: safeDownloadMime("text/plain"),
			contentLength: entry.size,
			filename,
		};
	}

	return null;
}

export function downloadResponse(payload: DownloadPayload): Response {
	const headers = new Headers({
		"Content-Type": payload.contentType,
		"Content-Disposition": contentDispositionAttachment(payload.filename),
		"X-Content-Type-Options": "nosniff",
	});

	if (payload.contentLength !== undefined) {
		headers.set("Content-Length", String(payload.contentLength));
	}

	return new Response(payload.body, { headers });
}
