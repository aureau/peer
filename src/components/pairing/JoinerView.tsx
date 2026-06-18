"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { claimSession, PairingApiError } from "@/lib/pairing/api";
import {
	clearActiveSession,
	loadActiveSession,
	saveActiveSession,
} from "@/lib/pairing/activeSession";
import {
	clearRememberedKey,
	loadRememberedKey,
	saveRememberedKey,
} from "@/lib/pairing/rememberKey";
import { validateJoinKey } from "@/lib/pairing/validate";
import { PairingSession } from "./PairingSession";

type JoinerViewProps = {
	/** "fixed" = personal key (default); "token" enables charset validation */
	mode?: "fixed" | "token";
};

/** maps server claim errors to calm, actionable messages */
function claimErrorMessage(error: unknown): string {
	if (error instanceof PairingApiError) {
		switch (error.code) {
			case "SESSION_NOT_FOUND":
				return "no session for that key — check it, or start one on the other device first.";
			case "SESSION_EXPIRED":
				return "that session expired — start a new one on the other device.";
			case "SESSION_ALREADY_CLAIMED":
				return "that session is already paired with another device.";
			default:
				return error.message;
		}
	}
	return "couldn't connect — check your connection and try again.";
}

export function JoinerView({ mode = "fixed" }: JoinerViewProps) {
	const [sessionKey, setSessionKey] = useState<string | null>(null);
	const [initialExpiresIn, setInitialExpiresIn] = useState(0);

	// refresh-resume: rejoin a session this tab is already in (sessionStorage)
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
				role="joiner"
				mode={mode}
				initialExpiresIn={initialExpiresIn}
				onReset={reset}
				onLeave={reset}
			/>
		);
	}

	return (
		<JoinForm
			mode={mode}
			onClaimed={(key, expiresIn) => {
				saveActiveSession(key);
				setInitialExpiresIn(expiresIn);
				setSessionKey(key);
			}}
		/>
	);
}

function JoinForm({
	mode,
	onClaimed,
}: {
	mode: "fixed" | "token";
	onClaimed: (key: string, expiresIn: number) => void;
}) {
	const [key, setKey] = useState("");
	const [remember, setRemember] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const remembered = loadRememberedKey();
		if (remembered) {
			setKey(remembered);
			setRemember(true);
		}
	}, []);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		const check = validateJoinKey(key, mode);
		if (!check.ok) {
			setError(check.message);
			return;
		}

		const trimmed = key.trim();
		setLoading(true);
		try {
			const result = await claimSession(trimmed);
			if (remember) saveRememberedKey(trimmed);
			else clearRememberedKey();
			onClaimed(trimmed, result.expiresIn);
		} catch (err) {
			setError(claimErrorMessage(err));
			setLoading(false);
		}
	};

	return (
		<form
			onSubmit={onSubmit}
			className="animate-rise-in flex w-full max-w-xs flex-col items-center gap-5"
		>
			<TextInput
				mono
				value={key}
				onChange={(e) => setKey(e.target.value)}
				placeholder="enter your key"
				autoFocus
				autoComplete="off"
				autoCapitalize="off"
				spellCheck={false}
				aria-label="join key"
			/>

			<label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
				<input
					type="checkbox"
					checked={remember}
					onChange={(e) => setRemember(e.target.checked)}
					className="size-3.5 accent-muted-strong"
				/>
				remember on this device
			</label>

			<Button type="submit" loading={loading} className="min-w-44">
				connect
			</Button>

			{error ? (
				<p className="animate-fade-in text-center text-sm text-status-lost" role="alert">
					{error}
				</p>
			) : null}
		</form>
	);
}
