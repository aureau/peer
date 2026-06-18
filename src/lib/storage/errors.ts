export type SessionErrorCode =
	| "SESSION_NOT_FOUND"
	| "SESSION_EXPIRED"
	| "SESSION_NOT_PAIRED"
	| "SESSION_ALREADY_CLAIMED";

export class SessionError extends Error {
	readonly code: SessionErrorCode;

	constructor(code: SessionErrorCode, message: string) {
		super(message);
		this.name = "SessionError";
		this.code = code;
	}
}

export function sessionErrorResponse(error: SessionError, status = 410): Response {
	return Response.json({ error: error.code, message: error.message }, { status });
}

export type UploadErrorCode = "FILE_TOO_LARGE" | "INVALID_FILE";

export class UploadError extends Error {
	readonly code: UploadErrorCode;

	constructor(code: UploadErrorCode, message: string) {
		super(message);
		this.name = "UploadError";
		this.code = code;
	}
}

export function uploadErrorResponse(error: UploadError): Response {
	const status = error.code === "FILE_TOO_LARGE" ? 413 : 400;
	return Response.json({ error: error.code, message: error.message }, { status });
}
