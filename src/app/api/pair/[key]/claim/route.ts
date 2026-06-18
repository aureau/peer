import {
	claimPair,
	getSessionView,
	getStorageBindings,
	SessionError,
	sessionErrorResponse,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string }> };

const CLAIM_ERROR_STATUS: Partial<Record<SessionError["code"], number>> = {
	SESSION_NOT_FOUND: 404,
	SESSION_EXPIRED: 410,
	SESSION_ALREADY_CLAIMED: 409,
};

export async function POST(_request: Request, context: RouteContext) {
	const { key } = await context.params;
	const bindings = getStorageBindings();

	try {
		const record = await claimPair(bindings, key);
		const view = getSessionView(record);

		return Response.json({
			ok: true,
			status: view.status,
			expiresIn: view.expiresIn,
		});
	} catch (error) {
		if (error instanceof SessionError) {
			return sessionErrorResponse(error, CLAIM_ERROR_STATUS[error.code] ?? 410);
		}
		throw error;
	}
}
