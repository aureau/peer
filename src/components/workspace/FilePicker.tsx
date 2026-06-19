"use client";

import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";

type FilePickerProps = {
	uploadFiles: (files: File[]) => Promise<void>;
};

/** fallback when drag-drop isn't available — same upload path as drop */
export function FilePicker({ uploadFiles }: FilePickerProps) {
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
				aria-label="choose files to send"
			/>
			<Button variant="ghost" onClick={() => inputRef.current?.click()}>
				choose files
			</Button>
		</>
	);
}
