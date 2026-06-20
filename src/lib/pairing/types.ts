/** shared pairing/connection vocabulary for the UI layer */

export type ConnectionState = "unpaired" | "waiting" | "paired" | "expired" | "lost";

/** fixed per tab for the whole session: which route claimed the pair */
export type PeerRole = "initiator" | "joiner";

/** POST /api/pair response */
export type StartSessionResponse = {
	key: string;
	status: "waiting" | "paired";
	expiresIn: number;
};

/** POST /api/pair/{key}/claim response */
export type ClaimResponse = {
	ok: true;
	status: "waiting" | "paired";
	expiresIn: number;
};

/** GET /api/{key}/status response */
export type StatusResponse = {
	status: "unpaired" | "waiting" | "paired" | "expired";
	expiresIn: number;
	/** present only when status === "paired" */
	activeSender?: PeerRole;
	/** present only when status === "paired" */
	receiveSinceSeq?: number;
};

/** POST /api/{key}/sender response (role flip) */
export type SetSenderResponse = {
	ok: true;
	activeSender: PeerRole;
	receiveSinceSeq: number;
};

/** POST /api/{key}/end response */
export type EndSessionResponse = {
	ok: true;
};

export type ApiErrorBody = {
	error: string;
	message: string;
};
