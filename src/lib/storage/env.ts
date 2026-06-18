import { getCloudflareContext } from "@opennextjs/cloudflare";

export type StorageBindings = Pick<CloudflareEnv, "KV" | "R2">;

export function getStorageBindings(): StorageBindings {
	const { env } = getCloudflareContext();
	return { KV: env.KV, R2: env.R2 };
}

export function getAccessToken(): string {
	const { env } = getCloudflareContext();
	const token = env.ACCESS_TOKEN?.trim();
	if (!token) {
		throw new Error("ACCESS_TOKEN is not configured");
	}
	return token;
}
