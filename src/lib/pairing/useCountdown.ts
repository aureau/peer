"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * local 1s countdown seeded from a server `expiresIn`.
 * call `sync` whenever a fresh value arrives (e.g. status poll) to correct drift.
 */
export function useCountdown(initialSeconds: number) {
	const [remaining, setRemaining] = useState(initialSeconds);
	const deadlineRef = useRef<number>(Date.now() + initialSeconds * 1000);

	useEffect(() => {
		const tick = () => {
			const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
			setRemaining(left);
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, []);

	const sync = useCallback((seconds: number) => {
		deadlineRef.current = Date.now() + seconds * 1000;
		setRemaining(Math.max(0, Math.floor(seconds)));
	}, []);

	return { remaining, expired: remaining <= 0, sync };
}
