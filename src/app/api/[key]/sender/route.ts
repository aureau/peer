import {
	flipSender,
	getStorageBindings,
	isPeerRole,
	SessionError,
	sessionErrorResponse,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string }> };

const SENDER_ERROR_STATUS: Partial<Record<SessionError["code"], number>> = {
	NOT_ACTIVE_SENDER: 403,
	SESSION_NOT_PAIRED: 409,
	SESSION_EXPIRED: 410,
	SESSION_NOT_FOUND: 410,
};

export async function POST(request: Request, context: RouteContext) {
	const { key } = await context.params;
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

	const peerRole = (body as Record<string, unknown> | null)?.peerRole;
	if (!isPeerRole(peerRole)) {
		return Response.json(
			{
				error: "INVALID_PEER_ROLE",
				message: 'Expected { peerRole: "initiator" | "joiner" }.',
			},
			{ status: 400 },
		);
	}

	try {
		const record = await flipSender(bindings, key, peerRole);
		return Response.json({
			ok: true,
			activeSender: record.activeSender,
			receiveSinceSeq: record.receiveSinceSeq,
		});
	} catch (error) {
		if (error instanceof SessionError) {
			return sessionErrorResponse(error, SENDER_ERROR_STATUS[error.code] ?? 410);
		}
		throw error;
	}
}
