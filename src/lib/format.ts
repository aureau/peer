/** seconds -> "m:ss" countdown (clamped at 0) */
export function formatCountdown(seconds: number): string {
	const safe = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(safe / 60);
	const secs = safe % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** human-readable byte size for file previews */
export function formatFileSize(bytes: number): string {
	if (bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"] as const;
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
	return `${value.toFixed(digits)} ${units[unit]}`;
}
