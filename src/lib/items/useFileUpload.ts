"use client";

import { useCallback, useRef, useState } from "react";
import { sendFile } from "@/lib/items/api";
import { itemsErrorMessage } from "@/lib/items/errors";
import { assertFilesWithinLimit, toUploadEntries } from "@/lib/items/files";
import type { PeerRole } from "@/lib/pairing/types";

export type UploadPreview = {
	count: number;
	totalBytes: number;
};

/** shared upload path for drag-drop, file picker, and folder picker */
export function useFileUpload(sessionKey: string, peerRole: PeerRole) {
	const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const uploadingRef = useRef(false);

	const uploadFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0 || uploadingRef.current) return;

			setError(null);

			try {
				assertFilesWithinLimit(files);
			} catch (err) {
				setError(itemsErrorMessage(err));
				return;
			}

			const entries = toUploadEntries(files);
			const totalBytes = entries.reduce((sum, entry) => sum + entry.file.size, 0);
			setUploadPreview({ count: entries.length, totalBytes });
			uploadingRef.current = true;

			try {
				for (const entry of entries) {
					await sendFile(sessionKey, entry.file, peerRole, {
						relativePath: entry.relativePath,
					});
				}
			} catch (err) {
				setError(itemsErrorMessage(err));
			} finally {
				uploadingRef.current = false;
				setUploadPreview(null);
			}
		},
		[sessionKey, peerRole],
	);

	return { uploadFiles, uploadPreview, error };
}
