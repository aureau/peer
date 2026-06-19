import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	ref?: Ref<HTMLTextAreaElement>;
};

/** calm, borderless textarea — monospace for text/code per spec. */
export function TextArea({ className, ref, ...rest }: TextAreaProps) {
	return (
		<textarea
			ref={ref}
			className={cn(
				"w-full resize-none rounded-2xl bg-button px-5 py-4 font-mono text-sm leading-relaxed text-foreground",
				"placeholder:text-muted/70 transition-shadow duration-[var(--dur)]",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
				className,
			)}
			{...rest}
		/>
	);
}
