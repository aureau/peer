"use client";

import { useFileUpload } from "@/lib/items/useFileUpload";
import type { PeerRole } from "@/lib/pairing/types";
import { FileDropLayer } from "./FileDropLayer";
import { FilePickers } from "./FilePickers";
import { TextSendArea } from "./TextSendArea";
import { UploadFeedback } from "./UploadFeedback";

type SendWorkspaceProps = {
	sessionKey: string;
	peerRole: PeerRole;
};

/** active-sender view: textarea, whole-window drop target, file/folder pickers */
export function SendWorkspace({ sessionKey, peerRole }: SendWorkspaceProps) {
	const { uploadFiles, uploadPreview, error } = useFileUpload(sessionKey, peerRole);

	return (
		<FileDropLayer uploadFiles={uploadFiles}>
			<div className="flex w-full flex-col gap-8">
				<TextSendArea sessionKey={sessionKey} peerRole={peerRole} />
				<FilePickers uploadFiles={uploadFiles} />
				<p className="text-center text-xs text-muted/80">
					drop a file or folder anywhere, or type text above.
				</p>
			</div>

			<UploadFeedback uploadPreview={uploadPreview} error={error} />
		</FileDropLayer>
	);
}
