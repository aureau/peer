"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ReceivedList } from "./ReceivedList";

type ReceiveWorkspaceProps = {
	/** paired session key — channel id for the received-items poll/download */
	sessionKey: string;
	/** seq floor for this receiver stint — only items with seq > this are shown */
	receiveSinceSeq: number;
	/** take over the send role; resolves once the server flip succeeds */
	onFlip: () => Promise<void>;
};

/** current-receiver view: received items list + send-from-here flip */
export function ReceiveWorkspace({ sessionKey, receiveSinceSeq, onFlip }: ReceiveWorkspaceProps) {
	const [flipping, setFlipping] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSendFromHere = useCallback(async () => {
		if (flipping) return;
		setFlipping(true);
		setError(null);
		try {
			await onFlip();
		} catch {
			setError("couldn't take over sending — try again.");
			setFlipping(false);
		}
	}, [flipping, onFlip]);

	return (
		<div className="flex w-full flex-col gap-8">
			<ReceivedList sessionKey={sessionKey} receiveSinceSeq={receiveSinceSeq} />

			<div className="flex flex-col items-center gap-2">
				<Button
					variant="ghost"
					onClick={() => void onSendFromHere()}
					loading={flipping}
				>
					send from here
				</Button>
				{error ? (
					<p className="animate-fade-in text-sm text-status-lost" role="alert">
						{error}
					</p>
				) : null}
			</div>
		</div>
	);
}
