"use client";

import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

type WorkspaceProps = {
	/** the paired session key (channel id for send/poll/download) */
	sessionKey: string;
	/** leave the workspace and reset to the start screen */
	onLeave: () => void;
};

/**
 * placeholder paired destination. the real send/receive workspace (textarea,
 * drop zone, received list, end-session) lands in its own issues under epic #5.
 * for #56 this just proves the transition into the paired state.
 */
export function Workspace({ sessionKey, onLeave }: WorkspaceProps) {
	void sessionKey;
	return (
		<div className="animate-fade-in flex flex-col items-center gap-5 text-center">
			<ConnectionStatus state="paired" />
			<p className="max-w-xs text-sm leading-relaxed text-muted">
				paired. nothing sent yet — the send / receive workspace lands here next.
			</p>
			<Button variant="ghost" onClick={onLeave}>
				leave
			</Button>
		</div>
	);
}
