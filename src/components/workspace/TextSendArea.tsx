"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { sendText } from "@/lib/items/api";
import { itemsErrorMessage } from "@/lib/items/errors";

type TextSendAreaProps = {
	sessionKey: string;
};

export function TextSendArea({ sessionKey }: TextSendAreaProps) {
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSend = text.length > 0 && !loading;

	const onSend = useCallback(async () => {
		if (!text || loading) return;

		setLoading(true);
		setError(null);
		try {
			await sendText(sessionKey, text);
			setText("");
		} catch (err) {
			setError(itemsErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [sessionKey, text, loading]);

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;
		event.preventDefault();
		void onSend();
	};

	return (
		<div className="flex w-full flex-col gap-4">
			<TextArea
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={onKeyDown}
				placeholder="type or paste text…"
				rows={6}
				spellCheck={false}
				aria-label="text to send"
			/>

			<div className="flex items-center justify-between gap-4">
				<span className="text-xs text-muted/80">ctrl+enter to send</span>
				<Button onClick={() => void onSend()} loading={loading} disabled={!canSend}>
					send
				</Button>
			</div>

			{error ? (
				<p className="animate-fade-in text-sm text-status-lost" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
