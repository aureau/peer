import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
	ref?: Ref<HTMLInputElement>;
	/** monospace + centered, for keys/tokens */
	mono?: boolean;
};

/** calm, borderless field that sits beneath the grey background. */
export function TextInput({ mono = false, className, ref, ...rest }: TextInputProps) {
	return (
		<input
			ref={ref}
			className={cn(
				"w-full rounded-full bg-button px-5 py-3 text-foreground placeholder:text-muted/70",
				"transition-shadow duration-[var(--dur)] focus-visible:outline-none",
				"focus-visible:ring-1 focus-visible:ring-ring/60",
				mono ? "text-center font-mono tracking-wide" : "",
				className,
			)}
			{...rest}
		/>
	);
}
