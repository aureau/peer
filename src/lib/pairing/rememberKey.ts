"use client";

/** local-only convenience: remember the join key on this device (never sent anywhere extra). */
const STORAGE_KEY = "relaypad.rememberedKey";

export function loadRememberedKey(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveRememberedKey(key: string): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, key);
	} catch {
		// storage unavailable (private mode / blocked) — ignore, it's only a convenience
	}
}

export function clearRememberedKey(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}