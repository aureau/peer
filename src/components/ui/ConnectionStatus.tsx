import { cn } from "@/lib/cn";
import type { ConnectionState } from "@/lib/pairing/types";

type ConnectionStatusProps = {
	state: ConnectionState;
	/** optional trailing detail, e.g. a countdown next to "Waiting" */
	detail?: string;
	className?: string;
};

const META: Record<ConnectionState, { label: string; dot: string }> = {
	unpaired: { label: "not connected", dot: "bg-status-unpaired" },
	waiting: { label: "waiting for other device", dot: "bg-status-waiting" },
	paired: { label: "connected", dot: "bg-status-paired" },
	expired: { label: "session expired", dot: "bg-status-unpaired" },
	lost: { label: "connection lost — retrying", dot: "bg-status-lost" },
};

export function ConnectionStatus({ state, detail, className }: ConnectionStatusProps) {
	const { label, dot } = META[state];
	const pulse = state === "waiting" || state === "lost";

	return (
		<span
			className={cn("inline-flex items-center gap-2 text-sm text-muted", className)}
			role="status"
			aria-live="polite"
		>
			<span className="relative flex size-2.5">
				{pulse ? (
					<span
						className={cn(
							"absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
							dot,
						)}
					/>
				) : null}
				<span className={cn("relative inline-flex size-2.5 rounded-full", dot)} />
			</span>
			<span>{label}</span>
			{detail ? <span className="font-mono text-muted-strong">{detail}</span> : null}
		</span>
	);
}
