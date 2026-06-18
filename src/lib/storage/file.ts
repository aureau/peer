import { MAX_FILE_UPLOAD_BYTES } from "./constants";
import { UploadError } from "./errors";
import type { StorageBindings } from "./env";
import { generateItemId } from "./ids";
import { appendItem } from "./items";
import { putR2Object } from "./r2";
import { requirePairedSession } from "./access";
import { sessionTtlForRecord } from "./session";
import type { StoreFileResult } from "./types";

type StoreFileInput = {
	name: string;
	mime?: string;
	relativePath?: string;
	body: ReadableStream<Uint8Array> | ArrayBuffer | string | null;
	/** required for streams — multipart file.size or content-length header */
	declaredSize: number;
};

function fileTooLargeError(): UploadError {
	const maxMb = MAX_FILE_UPLOAD_BYTES / (1024 * 1024);
	return new UploadError(
		"FILE_TOO_LARGE",
		`File exceeds the ${maxMb}MB upload limit.`,
	);
}

function assertWithinUploadLimit(size: number): void {
	if (size > MAX_FILE_UPLOAD_BYTES) {
		throw fileTooLargeError();
	}
}

function limitStream(
	stream: ReadableStream<Uint8Array>,
	maxBytes: number,
): ReadableStream<Uint8Array> {
	let uploaded = 0;

	return stream.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				uploaded += chunk.byteLength;
				if (uploaded > maxBytes) {
					controller.error(fileTooLargeError());
					return;
				}
				controller.enqueue(chunk);
			},
		}),
	);
}

function bodyForUpload(
	body: StoreFileInput["body"],
	declaredSize: number,
): ReadableStream<Uint8Array> | ArrayBuffer | string {
	assertWithinUploadLimit(declaredSize);

	if (body === null) {
		return new ArrayBuffer(0);
	}

	if (body instanceof ReadableStream) {
		return limitStream(body, declaredSize);
	}

	if (declaredSize === 0) {
		return new ArrayBuffer(0);
	}

	return body;
}

export function fileBasename(name: string): string {
	const normalized = name.replace(/\\/g, "/").trim();
	const base = normalized.split("/").pop()?.trim();
	return base || "file";
}

export async function storeFile(
	bindings: StorageBindings,
	sessionKey: string,
	input: StoreFileInput,
): Promise<StoreFileResult> {
	const record = await requirePairedSession(bindings, sessionKey, { rollTtl: true });
	const expirationTtl = sessionTtlForRecord(record);
	const itemId = generateItemId();
	const name = fileBasename(input.name);
	const mime = input.mime || "application/octet-stream";
	const body = bodyForUpload(input.body, input.declaredSize);

	const r2key = await putR2Object(bindings, sessionKey, itemId, body, {
		contentType: mime,
		contentLength: input.declaredSize,
	});

	const item = await appendItem(
		bindings,
		sessionKey,
		{
			itemId,
			type: "file",
			name,
			size: input.declaredSize,
			mime,
			relativePath: input.relativePath,
			r2key,
		},
		expirationTtl,
	);

	return { item };
}
