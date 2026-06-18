export type PairStatus = "waiting" | "paired";

export type PairRecord = {
	status: PairStatus;
	created: string;
	lastActive: string;
};

export type ItemType = "text" | "file";

export type ItemIndexEntry = {
	itemId: string;
	type: ItemType;
	seq: number;
	name?: string;
	size?: number;
	mime?: string;
	relativePath?: string;
	/** set when bytes live in r2 (files, or large text spilled from kv) */
	r2key?: string;
};

export type ItemIndex = {
	items: ItemIndexEntry[];
	nextSeq: number;
};

export type StoreTextResult = {
	item: ItemIndexEntry;
	inline: boolean;
};

export type StoreFileResult = {
	item: ItemIndexEntry;
};

/** item returned by GET /api/{key}/items poll — text includes content */
export type PollItem = {
	itemId: string;
	type: ItemType;
	seq: number;
	size?: number;
	name?: string;
	mime?: string;
	relativePath?: string;
	content?: string;
};
