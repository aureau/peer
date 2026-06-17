/** unclaimed session ttl — 3 minutes */
export const UNCLAIMED_TTL_SECONDS = 3 * 60;

/** paired session inactivity ttl — 10 minutes for now (spec allows 30–60 min) */
export const PAIRED_TTL_SECONDS = 10 * 60;

/** text at or below this size is stored inline in kv; larger text spills to r2 */
export const TEXT_INLINE_MAX_BYTES = 32 * 1024;
