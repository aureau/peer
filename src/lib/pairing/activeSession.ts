"use client";

/**
 * per-tab record of the session this device is currently in, so a refresh can
 * resume instead of re-claiming. sessionStorage = survives refresh, cleared on
 * tab close, and isolated per tab (so two local test windows don't clobber).
 */
const STORAGE_KEY = "relaypad.activeSession";

export function loadActiveSession(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveActiveSession(key: string): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(STORAGE_KEY, key);
	} catch {
		// storage unavailable — refresh-resume just won't work, not fatal
	}
}

export function clearActiveSession(): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
