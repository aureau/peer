/** random-token charset: unambiguous (no 0/O, 1/l/I), optional dashes, 6–9 chars */
const TOKEN_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789-]{6,9}$/;

export type Validation = { ok: true } | { ok: false; message: string };

export function validateJoinKey(value: string, mode: "fixed" | "token"): Validation {
	const trimmed = value.trim();
	if (!trimmed) {
		return { ok: false, message: "enter your key to connect." };
	}

	if (mode === "token" && !TOKEN_PATTERN.test(trimmed.toUpperCase())) {
		return {
			ok: false,
			message: "that doesn't look like a valid token — check for typos (no 0, O, 1, l, or I).",
		};
	}

	return { ok: true };
}
