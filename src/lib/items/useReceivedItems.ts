"use client";

import { useEffect, useRef, useState } from "react";
import { pollItems } from "./api";
import { itemsErrorMessage } from "./errors";
import type { ReceivedItem } from "./types";

/** poll cadence (spec §5/§13): fast while focused, back off when blurred, pause when hidden */
const POLL_FOCUSED_MS = 2000;
const POLL_BLURRED_MS = 10000;
const HIDDEN_RECHECK_MS = 1000;

export type ReceivedItems = {
	/** newest first */
	items: ReceivedItem[];
	error: string | null;
};

function sortNewestFirst(items: ReceivedItem[]): ReceivedItem[] {
	return [...items].sort((a, b) => b.seq - a.seq);
}

/**
 * Polls `GET /api/{key}/items?since=cursor` while mounted (i.e. while in receive
 * mode). The cursor floor starts at `receiveSinceSeq` and only advances, so each
 * receiver stint shows only items with `seq > receiveSinceSeq`. Resets when the
 * stint floor changes (role flip).
 */
export function useReceivedItems(sessionKey: string, receiveSinceSeq: number): ReceivedItems {
	const [items, setItems] = useState<ReceivedItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const cursorRef = useRef(receiveSinceSeq);

	useEffect(() => {
		// new receiver stint: reset the floor and clear prior-stint items
		cursorRef.current = receiveSinceSeq;
		setItems([]);
		setError(null);

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const schedule = (ms: number) => {
			timer = setTimeout(tick, ms);
		};

		const nextDelay = () => (document.hasFocus() ? POLL_FOCUSED_MS : POLL_BLURRED_MS);

		const tick = async () => {
			if (cancelled) return;

			// paused while hidden — cheap re-check, no network call
			if (typeof document !== "undefined" && document.hidden) {
				schedule(HIDDEN_RECHECK_MS);
				return;
			}

			try {
				const { items: fetched } = await pollItems(sessionKey, cursorRef.current);
				if (cancelled) return;

				if (fetched.length > 0) {
					cursorRef.current = fetched.reduce(
						(max, item) => Math.max(max, item.seq),
						cursorRef.current,
					);
					setItems((prev) => sortNewestFirst([...prev, ...fetched]));
				}
				setError(null);
			} catch (err) {
				if (cancelled) return;
				setError(itemsErrorMessage(err));
			}

			schedule(nextDelay());
		};

		tick();

		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, [sessionKey, receiveSinceSeq]);

	return { items, error };
}
