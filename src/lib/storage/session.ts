import { pairTtlForStatus } from "./pair";
import type { PairRecord } from "./types";

export type SessionViewStatus = "unpaired" | "waiting" | "paired" | "expired";

export type SessionView = {
	status: SessionViewStatus;
	/** seconds until kv ttl fires; 0 when unpaired/expired */
	expiresIn: number;
	record?: PairRecord;
};

export function computeExpiresIn(record: PairRecord, now = Date.now()): number {
	const ttl = pairTtlForStatus(record.status);
	const elapsed = (now - new Date(record.lastActive).getTime()) / 1000;
	return Math.max(0, Math.floor(ttl - elapsed));
}

export function getSessionView(record: PairRecord | null, now = Date.now()): SessionView {
	if (!record) {
		return { status: "unpaired", expiresIn: 0 };
	}

	const expiresIn = computeExpiresIn(record, now);
	if (expiresIn === 0) {
		return { status: "expired", expiresIn: 0, record };
	}

	return { status: record.status, expiresIn, record };
}

export function sessionTtlForRecord(record: PairRecord): number {
	return pairTtlForStatus(record.status);
}
