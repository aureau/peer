"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { endSession, PairingApiError } from "@/lib/pairing/api";
import { useSessionStatus } from "@/lib/pairing/useSessionStatus";
import { useFileUpload } from "@/lib/items/useFileUpload";
import { FileDropLayer } from "./FileDropLayer";
import { FilePickers } from "./FilePickers";
import { TextSendArea } from "./TextSendArea";
import { UploadFeedback } from "./UploadFeedback";

type WorkspaceProps = {
	/** the paired session key (channel id for send/poll/download) */
	sessionKey: string;
	/** return to the start screen after the session ends */
	onLeave: () => void;
};

function endSessionErrorMessage(error: unknown): string {
	if (error instanceof PairingApiError) return error.message;
	return "couldn't end session — check your connection and try again.";
}

export function Workspace({ sessionKey, onLeave }: WorkspaceProps) {
	const { state } = useSessionStatus(sessionKey);
	const { uploadFiles, uploadPreview, error: uploadError } = useFileUpload(sessionKey);
	const [ending, setEnding] = useState(false);
	const [endError, setEndError] = useState<string | null>(null);

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

	return (
		<FileDropLayer uploadFiles={uploadFiles}>
			<div className="animate-fade-in flex w-full max-w-2xl flex-col gap-8">
				<div className="flex items-center justify-between">
					<ConnectionStatus state="paired" />
					<Button variant="ghost" onClick={() => void onEndSession()} loading={ending}>
						end session
					</Button>
				</div>

				<TextSendArea sessionKey={sessionKey} />

				<FilePickers uploadFiles={uploadFiles} />

				{endError ? (
					<p className="animate-fade-in text-center text-sm text-status-lost" role="alert">
						{endError}
					</p>
				) : null}
			</div>

			<UploadFeedback uploadPreview={uploadPreview} error={uploadError} />
		</FileDropLayer>
	);
}
