/** tiny classname joiner — drops falsy values, no extra deps */
export function cn(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ");
}
