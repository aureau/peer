import type { NextConfig } from "next";

const projectRoot = import.meta.dirname;

const nextConfig: NextConfig = {
	// Pin tracing + turbopack to this app only. Without this, Next can infer
	// C:\Users\skinn as the workspace root when a stray package-lock.json exists there.
	outputFileTracingRoot: projectRoot,
	turbopack: {
		root: projectRoot,
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
