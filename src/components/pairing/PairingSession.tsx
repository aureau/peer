"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { Workspace } from "@/components/workspace/Workspace";
import { formatCountdown } from "@/lib/format";
import { useCountdown } from "@/lib/pairing/useCountdown";
import { useSessionStatus } from "@/lib/pairing/useSessionStatus";
import { TokenDisplay } from "./TokenDisplay";

type PairingSessionProps = {
	sessionKey: string;
	role: "initiator" | "joiner";
	mode: "fixed" | "token";
	/** seed for the countdown until the first poll re-syncs it */
	initialExpiresIn: number;
	/** terminal (expired/unpaired): clear state and return to start */
	onReset: () => void;
	/** leave a paired session and return to start */
	onLeave: () => void;
};

/**
 * shared post-key flow for both views: poll status until paired, keep the
 * countdown synced from the server, then transition into the workspace.
 * resets to start on expiry/disappearance.
 */
export function PairingSession({
	sessionKey,
	role,
	mode,
	initialExpiresIn,
	onReset,
	onLeave,
}: PairingSessionProps) {
	const { state, expiresIn } = useSessionStatus(sessionKey);
	const { remaining, sync } = useCountdown(initialExpiresIn);

	// re-sync the local countdown whenever a poll reports a fresh value
	useEffect(() => {
		if (expiresIn > 0) sync(expiresIn);
	}, [expiresIn, sync]);

	// terminal states: hand control back to the parent to reset
	useEffect(() => {
		if (state === "expired" || state === "unpaired") onReset();
	}, [state, onReset]);

	if (state === "paired") {
		return <Workspace sessionKey={sessionKey} onLeave={onLeave} />;
	}

	const lost = state === "lost";
	const showToken = role === "initiator" && mode === "token";

	return (
		<div className="animate-fade-in flex flex-col items-center gap-7">
			<ConnectionStatus
				state={lost ? "lost" : "waiting"}
				detail={lost ? undefined : formatCountdown(remaining)}
			/>

			{showToken ? <TokenDisplay token={sessionKey} /> : null}

			<Button variant="ghost" onClick={onReset}>
				cancel
			</Button>
		</div>
	);
}
