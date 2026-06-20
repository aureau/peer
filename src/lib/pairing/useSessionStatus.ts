"use client";

import { useEffect, useRef, useState } from "react";
import { getStatus } from "./api";
import type { PeerRole } from "./types";

/** poll cadence (spec §5): fast while focused, back off when blurred, pause when hidden */
const POLL_FOCUSED_MS = 2000;
const POLL_BLURRED_MS = 10000;
const HIDDEN_RECHECK_MS = 1000;
const LOST_AFTER_FAILURES = 2;

export type PollState = "loading" | "waiting" | "paired" | "expired" | "unpaired" | "lost";

export type SessionStatus = {
	state: PollState;
	/** latest server `expiresIn`; re-synced every successful poll */
	expiresIn: number;
	/** who may send right now; only present once `paired` */
	activeSender?: PeerRole;
	/** seq floor for the current receiver stint; only present once `paired` */
	receiveSinceSeq?: number;
};

/**
 * polls GET /api/{key}/status until a terminal state. keeps polling while
 * `paired` (the status route rolls the TTL, keeping the session alive).
 * stops on `expired`/`unpaired`. surfaces `lost` after repeated failures.
 */
export function useSessionStatus(sessionKey: string | null, enabled = true): SessionStatus {
	const [state, setState] = useState<PollState>("loading");
	const [expiresIn, setExpiresIn] = useState(0);
	const [activeSender, setActiveSender] = useState<PeerRole | undefined>(undefined);
	const [receiveSinceSeq, setReceiveSinceSeq] = useState<number | undefined>(undefined);
	const failuresRef = useRef(0);

	useEffect(() => {
		if (!sessionKey || !enabled) return;

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		failuresRef.current = 0;

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
				const result = await getStatus(sessionKey);
				if (cancelled) return;
				failuresRef.current = 0;
				setExpiresIn(result.expiresIn);
				setState(result.status);
				setActiveSender(result.activeSender);
				setReceiveSinceSeq(result.receiveSinceSeq);

				// terminal: stop polling, let the view reset
				if (result.status === "expired" || result.status === "unpaired") return;
			} catch {
				if (cancelled) return;
				failuresRef.current += 1;
				if (failuresRef.current >= LOST_AFTER_FAILURES) setState("lost");
			}

			schedule(nextDelay());
		};

		tick();

		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, [sessionKey, enabled]);

	return { state, expiresIn, activeSender, receiveSinceSeq };
}
