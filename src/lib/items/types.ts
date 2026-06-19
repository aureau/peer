/** POST /api/{key}/items (text or file) response */
export type SendItemResponse = {
	itemId: string;
	cursor: number;
};

/** @deprecated use SendItemResponse */
export type SendTextResponse = SendItemResponse;

export type ApiErrorBody = {
	error: string;
	message: string;
};
