import type { StorageBindings } from "./env";
import { pairKey } from "./keys";
import { deleteR2Objects } from "./r2";

function sessionKeyFromR2ObjectKey(objectKey: string): string | null {
	const slash = objectKey.indexOf("/");
	if (slash <= 0) return null;
	return objectKey.slice(0, slash);
}

export type OrphanSweepResult = {
	scanned: number;
	deleted: number;
};

/** delete r2 objects whose session kv metadata (pair:{key}) has expired */
export async function sweepOrphanedR2Objects(
	bindings: StorageBindings,
): Promise<OrphanSweepResult> {
	let cursor: string | undefined;
	let scanned = 0;
	let deleted = 0;
	const orphans: string[] = [];

	do {
		const listed = await bindings.R2.list({ cursor });

		for (const object of listed.objects) {
			scanned += 1;
			const sessionKey = sessionKeyFromR2ObjectKey(object.key);
			if (!sessionKey) continue;

			const pair = await bindings.KV.get(pairKey(sessionKey));
			if (!pair) {
				orphans.push(object.key);
			}
		}

		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);

	if (orphans.length > 0) {
		await deleteR2Objects(bindings, orphans);
		deleted = orphans.length;
	}

	return { scanned, deleted };
}
