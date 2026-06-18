import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
	children: ReactNode;
	/** optional element pinned to the top (e.g. connection status) */
	header?: ReactNode;
	className?: string;
};

/**
 * persistent app frame: the dark-grey background that stays put across every
 * screen. swap screens inside `children`; the shell never re-mounts.
 */
export function AppShell({ children, header, className }: AppShellProps) {
	return (
		<div className="flex min-h-dvh flex-col bg-background text-foreground">
			{header ? (
				<header className="flex items-center justify-between px-6 py-4">{header}</header>
			) : null}
			<main
				className={cn(
					"flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-10",
					className,
				)}
			>
				{children}
			</main>
		</div>
	);
}
