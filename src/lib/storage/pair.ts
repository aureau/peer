import { wipeSession } from "./wipe";
import { PAIRED_TTL_SECONDS, UNCLAIMED_TTL_SECONDS } from "./constants";
import type { StorageBindings } from "./env";
import { pairKey } from "./keys";
import type { PairRecord, PairStatus } from "./types";

export function pairTtlForStatus(status: PairStatus): number {
	return status === "waiting" ? UNCLAIMED_TTL_SECONDS : PAIRED_TTL_SECONDS;
}

export async function getPair(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<PairRecord | null> {
	const raw = await bindings.KV.get(pairKey(sessionKey), "json");
	return raw as PairRecord | null;
}

export async function putPair(
	bindings: StorageBindings,
	sessionKey: string,
	record: PairRecord,
): Promise<void> {
	await bindings.KV.put(pairKey(sessionKey), JSON.stringify(record), {
		expirationTtl: pairTtlForStatus(record.status),
	});
}

export async function createPair(
	bindings: StorageBindings,
	sessionKey: string,
	status: PairStatus = "waiting",
): Promise<PairRecord> {
	await wipeSession(bindings, sessionKey);

	const now = new Date().toISOString();
	const record: PairRecord = { status, created: now, lastActive: now };
	await putPair(bindings, sessionKey, record);
	return record;
}

export async function touchPair(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<PairRecord | null> {
	const record = await getPair(bindings, sessionKey);
	if (!record) return null;

	record.lastActive = new Date().toISOString();
	await putPair(bindings, sessionKey, record);
	return record;
}

export async function setPairStatus(
	bindings: StorageBindings,
	sessionKey: string,
	status: PairStatus,
): Promise<PairRecord | null> {
	const record = await getPair(bindings, sessionKey);
	if (!record) return null;

	record.status = status;
	record.lastActive = new Date().toISOString();
	await putPair(bindings, sessionKey, record);
	return record;
}

export async function deletePair(
	bindings: StorageBindings,
	sessionKey: string,
): Promise<void> {
	await bindings.KV.delete(pairKey(sessionKey));
}
