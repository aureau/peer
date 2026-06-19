import { ItemsApiError } from "./api";
import { MAX_FILE_UPLOAD_BYTES, MAX_FILE_UPLOAD_LABEL } from "./constants";

export type UploadEntry = {
	file: File;
	relativePath?: string;
};

export function collectFiles(transfer: DataTransfer): File[] {
	if (transfer.files.length > 0) {
		return Array.from(transfer.files);
	}

	const files: File[] = [];
	for (const item of transfer.items) {
		if (item.kind !== "file") continue;
		const file = item.getAsFile();
		if (file) files.push(file);
	}
	return files;
}

/** map browser files to upload entries, preserving folder relative paths when present */
export function toUploadEntries(files: File[]): UploadEntry[] {
	return files.map((file) => ({
		file,
		relativePath: file.webkitRelativePath || undefined,
	}));
}

/** best-effort peek during drag-over — sizes may be 0 until drop in some browsers */
export function peekTransfer(transfer: DataTransfer): { count: number; totalBytes: number } {
	const files = collectFiles(transfer);
	return {
		count: files.length,
		totalBytes: files.reduce((sum, file) => sum + file.size, 0),
	};
}

/**
 * all-or-nothing size check before any upload starts.
 * throws ItemsApiError(FILE_TOO_LARGE) if any file exceeds the cap.
 */
export function assertFilesWithinLimit(files: File[]): void {
	const oversized = files.filter((file) => file.size > MAX_FILE_UPLOAD_BYTES);
	if (oversized.length === 0) return;

	const message =
		oversized.length === 1
			? `"${oversized[0].name}" exceeds the ${MAX_FILE_UPLOAD_LABEL} limit.`
			: `${oversized.length} files exceed the ${MAX_FILE_UPLOAD_LABEL} limit — nothing was sent.`;

	throw new ItemsApiError(413, "FILE_TOO_LARGE", message);
}

export function supportsFolderPicker(): boolean {
	if (typeof document === "undefined") return false;
	return "webkitdirectory" in document.createElement("input");
}
