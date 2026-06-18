import {
	downloadResponse,
	getItemDownload,
	getStorageBindings,
	SessionError,
	sessionErrorResponse,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ key: string; id: string }> };

const DOWNLOAD_ERROR_STATUS: Partial<Record<SessionError["code"], number>> = {
	SESSION_EXPIRED: 410,
	SESSION_NOT_PAIRED: 403,
};

export async function GET(_request: Request, context: RouteContext) {
	const { key, id } = await context.params;
	const bindings = getStorageBindings();

	try {
		const payload = await getItemDownload(bindings, key, id);
		if (!payload) {
			return Response.json(
				{ error: "ITEM_NOT_FOUND", message: "Item not found in this session." },
				{ status: 404 },
			);
		}

		return downloadResponse(payload);
	} catch (error) {
		if (error instanceof SessionError) {
			return sessionErrorResponse(error, DOWNLOAD_ERROR_STATUS[error.code] ?? 410);
		}
		throw error;
	}
}
