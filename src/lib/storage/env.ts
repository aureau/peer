import { getCloudflareContext } from "@opennextjs/cloudflare";

export type StorageBindings = Pick<CloudflareEnv, "KV" | "R2">;

export function getStorageBindings(): StorageBindings {
	const { env } = getCloudflareContext();
	return { KV: env.KV, R2: env.R2 };
}
