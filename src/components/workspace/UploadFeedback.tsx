import { formatFileSize } from "@/lib/format";
import type { UploadPreview } from "@/lib/items/useFileUpload";

type UploadFeedbackProps = {
	uploadPreview: UploadPreview | null;
	error: string | null;
};

/** bottom-of-screen send status + errors — shared by drag-drop and file picker */
export function UploadFeedback({ uploadPreview, error }: UploadFeedbackProps) {
	return (
		<>
			{uploadPreview ? (
				<div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
					<p className="text-xs text-muted">
						sending {uploadPreview.count} file{uploadPreview.count === 1 ? "" : "s"} ·{" "}
						{formatFileSize(uploadPreview.totalBytes)}
					</p>
				</div>
			) : null}

			{error ? (
				<div className="fixed bottom-8 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-6">
					<p className="animate-fade-in text-center text-sm text-status-lost" role="alert">
						{error}
					</p>
				</div>
			) : null}
		</>
	);
}
