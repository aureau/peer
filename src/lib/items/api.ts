import type { PeerRole } from "@/lib/pairing/types";
import type { ApiErrorBody, SendItemResponse } from "./types";

/** thrown for non-2xx item API responses */
export class ItemsApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "ItemsApiError";
		this.status = status;
		this.code = code;
	}
}

async function parseJson<T>(response: Response): Promise<T> {
	if (response.ok) {
		return (await response.json()) as T;
	}

	let body: Partial<ApiErrorBody> = {};
	try {
		body = (await response.json()) as ApiErrorBody;
	} catch {
		// non-json error body; fall through to generic message
	}

	throw new ItemsApiError(
		response.status,
		body.error ?? "REQUEST_FAILED",
		body.message ?? "Something went wrong. Try again.",
	);
}

/** send a text item to the paired session channel */
export async function sendText(
	key: string,
	content: string,
	peerRole: PeerRole,
	signal?: AbortSignal,
): Promise<SendItemResponse> {
	const response = await fetch(`/api/${encodeURIComponent(key)}/items`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ type: "text", content, peerRole }),
		signal,
	});
	return parseJson<SendItemResponse>(response);
}

/** send a file item via multipart upload */
export async function sendFile(
	key: string,
	file: File,
	peerRole: PeerRole,
	options?: { relativePath?: string; signal?: AbortSignal },
): Promise<SendItemResponse> {
	const form = new FormData();
	form.append("file", file);
	form.append("peerRole", peerRole);
	if (options?.relativePath) {
		form.append("relativePath", options.relativePath);
	}

	const response = await fetch(`/api/${encodeURIComponent(key)}/items`, {
		method: "POST",
		body: form,
		signal: options?.signal,
	});
	return parseJson<SendItemResponse>(response);
}
