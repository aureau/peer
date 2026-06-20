"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

type ReceiveWorkspaceProps = {
	/** paired session key — consumed by the #29 received-items list */
	sessionKey: string;
	/** seq floor for this receiver stint — consumed by the #29 list poll */
	receiveSinceSeq: number;
	/** take over the send role; resolves once the server flip succeeds */
	onFlip: () => Promise<void>;
};

/** current-receiver view: received items list (#29 placeholder) + send-from-here flip */
export function ReceiveWorkspace({ onFlip }: ReceiveWorkspaceProps) {
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
			<div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-ring px-6 py-10">
				<p className="text-sm text-muted/80">waiting for items…</p>
			</div>

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
