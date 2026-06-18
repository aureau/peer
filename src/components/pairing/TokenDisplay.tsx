import { CopyButton } from "@/components/ui/CopyButton";

type TokenDisplayProps = {
	token: string;
};

/** large, readable token for random-token mode (read across a desk). */
export function TokenDisplay({ token }: TokenDisplayProps) {
	return (
		<div className="flex flex-col items-center gap-3">
			<span className="select-all font-mono text-3xl font-bold tracking-[0.15em] text-foreground">
				{token}
			</span>
			<CopyButton value={token} label="Copy token" />
		</div>
	);
}
