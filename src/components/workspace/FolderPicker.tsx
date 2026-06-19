"use client";

import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";

type FolderPickerProps = {
	uploadFiles: (files: File[]) => Promise<void>;
};

/** enumerates a folder via webkitdirectory — relative paths preserved on each file */
export function FolderPicker({ uploadFiles }: FolderPickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length > 0) void uploadFiles(files);
	};

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				multiple
				className="sr-only"
				onChange={onChange}
				aria-label="choose folder to send"
				{...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
			/>
			<Button variant="ghost" onClick={() => inputRef.current?.click()}>
				choose folder
			</Button>
		</>
	);
}
