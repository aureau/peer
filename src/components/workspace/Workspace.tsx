"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { endSession, PairingApiError, setSender } from "@/lib/pairing/api";
import type { PeerRole } from "@/lib/pairing/types";
import { useSessionStatus } from "@/lib/pairing/useSessionStatus";
import { ReceiveWorkspace } from "./ReceiveWorkspace";
import { SendWorkspace } from "./SendWorkspace";

type WorkspaceProps = {
	/** the paired session key (channel id for send/poll/download) */
	sessionKey: string;
	/** fixed for this tab: which route claimed the pair */
	peerRole: PeerRole;
	/** return to the start screen after the session ends */
	onLeave: () => void;
};

function endSessionErrorMessage(error: unknown): string {
	if (error instanceof PairingApiError) return error.message;
	return "couldn't end session — check your connection and try again.";
}

/**
 * Hybrid container: owns the shared chrome (connection status, end session) and
 * the status poll, then swaps between the send and receive sub-views based on
 * the server `activeSender`. Chrome stays mounted across a flip — only the inner
 * view changes — so the status dot and end button never remount.
 */
export function Workspace({ sessionKey, peerRole, onLeave }: WorkspaceProps) {
	const { state, activeSender, receiveSinceSeq } = useSessionStatus(sessionKey);
	const [ending, setEnding] = useState(false);
	const [endError, setEndError] = useState<string | null>(null);

	// activeSender defaults to "initiator" on claim; keep a local copy so a flip
	// switches the view immediately rather than waiting for the next poll.
	const [sender, setSenderState] = useState<PeerRole>("initiator");
	useEffect(() => {
		if (activeSender) setSenderState(activeSender);
	}, [activeSender]);

	// other device ended the session — reset to start
	useEffect(() => {
		if (state === "unpaired" || state === "expired") onLeave();
	}, [state, onLeave]);

	const onEndSession = useCallback(async () => {
		setEnding(true);
		setEndError(null);
		try {
			await endSession(sessionKey);
			onLeave();
		} catch (err) {
			setEndError(endSessionErrorMessage(err));
			setEnding(false);
		}
	}, [sessionKey, onLeave]);

	const onFlip = useCallback(async () => {
		const result = await setSender(sessionKey, peerRole);
		setSenderState(result.activeSender);
	}, [sessionKey, peerRole]);

	const isSending = peerRole === sender;

	return (
		<div className="animate-fade-in flex w-full max-w-2xl flex-col gap-8">
			<div className="flex items-center justify-between">
				<ConnectionStatus state={state === "lost" ? "lost" : "paired"} />
				<Button variant="ghost" onClick={() => void onEndSession()} loading={ending}>
					end session
				</Button>
			</div>

			{isSending ? (
				<SendWorkspace sessionKey={sessionKey} peerRole={peerRole} />
			) : (
				<ReceiveWorkspace
					sessionKey={sessionKey}
					receiveSinceSeq={receiveSinceSeq ?? -1}
					onFlip={onFlip}
				/>
			)}

			{endError ? (
				<p className="animate-fade-in text-center text-sm text-status-lost" role="alert">
					{endError}
				</p>
			) : null}
		</div>
	);
}
