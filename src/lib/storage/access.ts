import { SessionError } from "./errors";
import type { StorageBindings } from "./env";
import { getItemIndex, refreshItemIndexTtl } from "./items";
import { getPair, pairTtlForStatus, putPair, touchPair } from "./pair";
import { getSessionView } from "./session";
import type { PairRecord, PeerRole } from "./types";

type RequireSessionOptions = {
	/** bump lastActive and re-apply kv ttl (default true) */
	rollTtl?: boolean;
};

type RequirePairedOptions = RequireSessionOptions;

export async function touchSession(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<PairRecord | null> {
	const record = await touchPair(bindings, sessionKey);
	if (!record) return null;

	const ttl = pairTtlForStatus(record.status);
	await refreshItemIndexTtl(bindings, sessionKey, ttl);
	return record;
}

async function requireLiveSession(
	bindings: StorageBindings,
	sessionKey: string,
	options: RequireSessionOptions = {},
): Promise<PairRecord> {
	const record = await getPair(bindings, sessionKey);
	if (!record) {
		throw new SessionError(
			"SESSION_EXPIRED",
			"Session expired or not found. Start a new session.",
		);
	}

	const view = getSessionView(record);
	if (view.status === "expired") {
		throw new SessionError("SESSION_EXPIRED", "Session expired. Start a new session.");
	}

	if (options.rollTtl ?? true) {
		const touched = await touchSession(bindings, sessionKey);
		if (!touched) {
			throw new SessionError("SESSION_EXPIRED", "Session expired. Start a new session.");
		}
		return touched;
	}

	return record;
}

/** active waiting or paired session; rolls ttl by default */
export async function requireActiveSession(
	bindings: StorageBindings,
	sessionKey: string,
	options?: RequireSessionOptions,
): Promise<PairRecord> {
	return requireLiveSession(bindings, sessionKey, options);
}

/** paired session only; rolls ttl by default */
export async function requirePairedSession(
	bindings: StorageBindings,
	sessionKey: string,
	options?: RequirePairedOptions,
): Promise<PairRecord> {
	const record = await requireLiveSession(bindings, sessionKey, options);
	if (record.status !== "paired") {
		throw new SessionError(
			"SESSION_NOT_PAIRED",
			"Session is not paired yet. Wait for the other device to connect.",
		);
	}
	return record;
}

/** paired session where the caller's role is the active sender; rolls ttl by default */
export async function requireActiveSender(
	bindings: StorageBindings,
	sessionKey: string,
	peerRole: PeerRole,
	options?: RequirePairedOptions,
): Promise<PairRecord> {
	const record = await requirePairedSession(bindings, sessionKey, options);
	if (record.activeSender !== peerRole) {
		throw new SessionError(
			"NOT_ACTIVE_SENDER",
			"This device is not the active sender. The other device currently has the send role.",
		);
	}
	return record;
}

/**
 * Flip the active sender to the caller. Only the current receiver may flip.
 * Sets activeSender = peerRole and receiveSinceSeq = highest seq in the index.
 */
export async function flipSender(
	bindings: StorageBindings,
	sessionKey: string,
	peerRole: PeerRole,
): Promise<PairRecord> {
	const record = await requirePairedSession(bindings, sessionKey, { rollTtl: true });
	if (record.activeSender === peerRole) {
		throw new SessionError(
			"NOT_ACTIVE_SENDER",
			"Only the current receiver can take over sending.",
		);
	}

	const index = await getItemIndex(bindings, sessionKey);
	const maxSeqInIndex = index.items.reduce((max, item) => Math.max(max, item.seq), 0);

	record.activeSender = peerRole;
	record.receiveSinceSeq = maxSeqInIndex;
	record.lastActive = new Date().toISOString();
	await putPair(bindings, sessionKey, record);
	return record;
}
