"use client";

import { supportsFolderPicker } from "@/lib/items/files";
import { FilePicker } from "./FilePicker";
import { FolderPicker } from "./FolderPicker";

type FilePickersProps = {
	uploadFiles: (files: File[]) => Promise<void>;
};

export function FilePickers({ uploadFiles }: FilePickersProps) {
	const folderSupported = supportsFolderPicker();

	return (
		<div className="flex w-full flex-wrap items-center justify-center gap-2">
			<FilePicker uploadFiles={uploadFiles} />
			{folderSupported ? <FolderPicker uploadFiles={uploadFiles} /> : null}
		</div>
	);
}
