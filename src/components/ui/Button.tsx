import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	loading?: boolean;
	children: ReactNode;
};

const base =
	"inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm tracking-wide " +
	"transition-colors duration-[var(--dur)] focus-visible:outline-none " +
	"focus-visible:ring-1 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
	primary: "bg-transparent text-muted hover:bg-button hover:text-foreground",
	ghost: "bg-transparent text-muted hover:text-foreground",
};

export function Button({
	variant = "primary",
	loading = false,
	disabled,
	className,
	children,
	...rest
}: ButtonProps) {
	return (
		<button
			className={cn(base, variants[variant], className)}
			disabled={disabled || loading}
			{...rest}
		>
			{loading ? <Spinner /> : null}
			{children}
		</button>
	);
}

function Spinner() {
	return (
		<span
			aria-hidden
			className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
		/>
	);
}
