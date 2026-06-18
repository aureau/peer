/** seconds -> "m:ss" countdown (clamped at 0) */
export function formatCountdown(seconds: number): string {
	const safe = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(safe / 60);
	const secs = safe % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
