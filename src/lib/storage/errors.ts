export type SessionErrorCode =
	| "SESSION_NOT_FOUND"
	| "SESSION_EXPIRED"
	| "SESSION_NOT_PAIRED";

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
