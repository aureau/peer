import type {
	ApiErrorBody,
	ClaimResponse,
	EndSessionResponse,
	StartSessionResponse,
	StatusResponse,
} from "./types";

/** thrown for non-2xx responses; carries the server error code so views can branch on it */
export class PairingApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "PairingApiError";
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

	throw new PairingApiError(
		response.status,
		body.error ?? "REQUEST_FAILED",
		body.message ?? "Something went wrong. Try again.",
	);
}

/** initiator: start a session with the server-configured fixed key */
export async function startSession(signal?: AbortSignal): Promise<StartSessionResponse> {
	const response = await fetch("/api/pair", { method: "POST", signal });
	return parseJson<StartSessionResponse>(response);
}

/** joiner: claim an existing waiting session by key */
export async function claimSession(key: string, signal?: AbortSignal): Promise<ClaimResponse> {
	const response = await fetch(`/api/pair/${encodeURIComponent(key)}/claim`, {
		method: "POST",
		signal,
	});
	return parseJson<ClaimResponse>(response);
}

/** poll the current session status */
export async function getStatus(key: string, signal?: AbortSignal): Promise<StatusResponse> {
	const response = await fetch(`/api/${encodeURIComponent(key)}/status`, {
		method: "GET",
		signal,
	});
	return parseJson<StatusResponse>(response);
}

/** wipe all session data server-side and reset both devices to unpaired */
export async function endSession(
	key: string,
	signal?: AbortSignal,
): Promise<EndSessionResponse> {
	const response = await fetch(`/api/${encodeURIComponent(key)}/end`, {
		method: "POST",
		signal,
	});
	return parseJson<EndSessionResponse>(response);
}
