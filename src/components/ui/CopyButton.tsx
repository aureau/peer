"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type CopyButtonProps = {
	value: string;
	label?: string;
	className?: string;
};

/** copies `value` to the clipboard and flips to a short confirmation. */
export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	const onCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(false), 1600);
		} catch {
			// clipboard blocked (insecure context / permissions) — leave label unchanged
		}
	}, [value]);

	return (
		<Button variant="ghost" onClick={onCopy} className={className} aria-live="polite">
			{copied ? "Copied" : label}
		</Button>
	);
}
