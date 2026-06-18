"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PairingApiError, startSession } from "@/lib/pairing/api";
import {
	clearActiveSession,
	loadActiveSession,
	saveActiveSession,
} from "@/lib/pairing/activeSession";
import { PairingSession } from "./PairingSession";

type InitiatorViewProps = {
	/** "fixed" hides the secret; "token" shows it large with Copy (spec §2) */
	mode?: "fixed" | "token";
};

export function InitiatorView({ mode = "fixed" }: InitiatorViewProps) {
	const [sessionKey, setSessionKey] = useState<string | null>(null);
	const [initialExpiresIn, setInitialExpiresIn] = useState(0);

	// refresh-resume: a session we started survives a reload (sessionStorage)
	useEffect(() => {
		const active = loadActiveSession();
		if (active) setSessionKey(active);
	}, []);

	const reset = useCallback(() => {
		clearActiveSession();
		setSessionKey(null);
		setInitialExpiresIn(0);
	}, []);

	if (sessionKey) {
		return (
			<PairingSession
				sessionKey={sessionKey}
				role="initiator"
				mode={mode}
				initialExpiresIn={initialExpiresIn}
				onReset={reset}
				onLeave={reset}
			/>
		);
	}

	return (
		<IdlePanel
			onStarted={(key, expiresIn) => {
				saveActiveSession(key);
				setInitialExpiresIn(expiresIn);
				setSessionKey(key);
			}}
		/>
	);
}

function IdlePanel({
	onStarted,
}: {
	onStarted: (key: string, expiresIn: number) => void;
}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onStart = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await startSession();
			onStarted(result.key, result.expiresIn);
		} catch (err) {
			const message =
				err instanceof PairingApiError
					? err.message
					: "couldn't start a session. check your connection and try again.";
			setError(message);
			setLoading(false);
		}
	}, [onStarted]);

	return (
		<div className="animate-rise-in flex flex-col items-center gap-6">
			<Button onClick={onStart} loading={loading} className="min-w-44">
				start session
			</Button>
			{error ? (
				<p className="animate-fade-in text-sm text-status-lost" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
