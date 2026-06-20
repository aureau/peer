/** POST /api/{key}/items (text or file) response */
export type SendItemResponse = {
	itemId: string;
	cursor: number;
};

export type ReceivedItemType = "text" | "file";

/** one entry from GET /api/{key}/items?since=cursor (mirrors the server PollItem) */
export type ReceivedItem = {
	itemId: string;
	type: ReceivedItemType;
	seq: number;
	size?: number;
	name?: string;
	mime?: string;
	relativePath?: string;
	/** present for text items only */
	content?: string;
};

/** GET /api/{key}/items?since=cursor response */
export type PollItemsResponse = {
	items: ReceivedItem[];
};

/** @deprecated use SendItemResponse */
export type SendTextResponse = SendItemResponse;

export type ApiErrorBody = {
	error: string;
	message: string;
};
