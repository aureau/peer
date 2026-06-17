// generated at build time by opennext — wrangler bundles this entry, not next.js
// @ts-expect-error .open-next/worker.js exists after `opennextjs-cloudflare build`
import { default as openNextWorker } from "./.open-next/worker.js";
import { sweepOrphanedR2Objects } from "./src/lib/storage/sweep";

export default {
	fetch: openNextWorker.fetch.bind(openNextWorker),

	async scheduled(
		_controller: ScheduledController,
		env: CloudflareEnv,
		ctx: ExecutionContext,
	): Promise<void> {
		ctx.waitUntil(
			sweepOrphanedR2Objects({ KV: env.KV, R2: env.R2 }).then((result) => {
				console.log(
					`r2 orphan sweep: scanned=${result.scanned} deleted=${result.deleted}`,
				);
			}),
		);
	},
} satisfies ExportedHandler<CloudflareEnv>;

// @ts-expect-error .open-next/worker.js exists after `opennextjs-cloudflare build`
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
