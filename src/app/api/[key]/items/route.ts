import {
	fileBasename,
	getStorageBindings,
	MAX_FILE_UPLOAD_BYTES,
	pollItems,
	SessionError,
	sessionErrorResponse,
	storeFile,
	storeText,
	UploadError,
	uploadErrorResponse,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string }> };

type TextUploadBody = {
	type: "text";
	content: string;
};

const ITEMS_ERROR_STATUS: Partial<Record<SessionError["code"], number>> = {
	SESSION_EXPIRED: 410,
	SESSION_NOT_PAIRED: 403,
};

function parseSinceCursor(raw: string | null): number | null {
	if (raw === null) return -1;
	if (!/^-?\d+$/.test(raw)) return null;
	const cursor = Number.parseInt(raw, 10);
	if (!Number.isSafeInteger(cursor) || cursor < -1) return null;
	return cursor;
}

function parseTextUploadBody(body: unknown): TextUploadBody | null {
	if (!body || typeof body !== "object") return null;
	const { type, content } = body as Record<string, unknown>;
	if (type !== "text" || typeof content !== "string") return null;
	return { type, content };
}

function optionalRelativePath(value: FormDataEntryValue | string | null): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseContentLength(raw: string | null): number | null {
	if (raw === null) return null;
	const size = Number.parseInt(raw, 10);
	if (!Number.isSafeInteger(size) || size < 0) return null;
	return size;
}

function uploadSuccessResponse(itemId: string, cursor: number): Response {
	return Response.json({ itemId, cursor });
}

function handleRouteError(error: unknown): Response {
	if (error instanceof SessionError) {
		return sessionErrorResponse(error, ITEMS_ERROR_STATUS[error.code] ?? 410);
	}
	if (error instanceof UploadError) {
		return uploadErrorResponse(error);
	}
	throw error;
}

async function handleTextUpload(request: Request, key: string): Promise<Response> {
	const bindings = getStorageBindings();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: "INVALID_JSON", message: "Request body must be valid JSON." },
			{ status: 400 },
		);
	}

	const payload = parseTextUploadBody(body);
	if (!payload) {
		return Response.json(
			{
				error: "INVALID_PAYLOAD",
				message: 'Expected { type: "text", content: string }.',
			},
			{ status: 400 },
		);
	}

	const { item } = await storeText(bindings, key, payload.content);
	return uploadSuccessResponse(item.itemId, item.seq);
}

async function handleMultipartFileUpload(request: Request, key: string): Promise<Response> {
	const bindings = getStorageBindings();
	const formData = await request.formData();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		throw new UploadError("INVALID_FILE", 'Missing "file" field in multipart upload.');
	}

	const { item } = await storeFile(bindings, key, {
		name: file.name,
		mime: file.type || undefined,
		relativePath: optionalRelativePath(formData.get("relativePath")),
		body: file.stream(),
		declaredSize: file.size,
	});

	return uploadSuccessResponse(item.itemId, item.seq);
}

async function handleRawFileUpload(request: Request, key: string): Promise<Response> {
	const bindings = getStorageBindings();
	const url = new URL(request.url);
	const rawName = request.headers.get("X-File-Name") ?? url.searchParams.get("name");

	if (!rawName?.trim()) {
		throw new UploadError(
			"INVALID_FILE",
			"Missing file name (X-File-Name header or name query param).",
		);
	}

	const declaredSize = parseContentLength(request.headers.get("content-length"));
	if (declaredSize === null) {
		throw new UploadError(
			"INVALID_FILE",
			"Content-Length header is required for raw file uploads.",
		);
	}
	if (declaredSize > MAX_FILE_UPLOAD_BYTES) {
		throw new UploadError(
			"FILE_TOO_LARGE",
			`File exceeds the ${MAX_FILE_UPLOAD_BYTES / (1024 * 1024)}MB upload limit.`,
		);
	}

	const { item } = await storeFile(bindings, key, {
		name: fileBasename(rawName),
		mime: request.headers.get("content-type")?.split(";")[0]?.trim() || undefined,
		relativePath: optionalRelativePath(
			request.headers.get("X-Relative-Path") ?? url.searchParams.get("relativePath"),
		),
		body: request.body,
		declaredSize,
	});

	return uploadSuccessResponse(item.itemId, item.seq);
}

export async function GET(request: Request, context: RouteContext) {
	const { key } = await context.params;
	const bindings = getStorageBindings();
	const cursor = parseSinceCursor(new URL(request.url).searchParams.get("since"));

	if (cursor === null) {
		return Response.json(
			{
				error: "INVALID_CURSOR",
				message: "Query param since must be an integer >= -1.",
			},
			{ status: 400 },
		);
	}

	try {
		const items = await pollItems(bindings, key, cursor);
		return Response.json({ items });
	} catch (error) {
		return handleRouteError(error);
	}
}

export async function POST(request: Request, context: RouteContext) {
	const { key } = await context.params;
	const contentType = request.headers.get("content-type") ?? "";

	try {
		if (contentType.includes("application/json")) {
			return await handleTextUpload(request, key);
		}
		if (contentType.includes("multipart/form-data")) {
			return await handleMultipartFileUpload(request, key);
		}
		return await handleRawFileUpload(request, key);
	} catch (error) {
		return handleRouteError(error);
	}
}
