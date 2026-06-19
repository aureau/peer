"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatFileSize } from "@/lib/format";
import { collectFiles, peekTransfer } from "@/lib/items/files";

type DragPreview = {
	count: number;
	totalBytes: number;
};

type FileDropLayerProps = {
	uploadFiles: (files: File[]) => Promise<void>;
	children: ReactNode;
};

/** whole-window drag target when paired — delegates uploads to the shared hook */
export function FileDropLayer({ uploadFiles, children }: FileDropLayerProps) {
	const [dragging, setDragging] = useState(false);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const dragDepth = useRef(0);

	useEffect(() => {
		const hasFiles = (transfer: DataTransfer) =>
			Array.from(transfer.types).includes("Files");

		const onDragEnter = (event: DragEvent) => {
			const transfer = event.dataTransfer;
			if (!transfer || !hasFiles(transfer)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setDragging(true);
			setDragPreview(peekTransfer(transfer));
		};

		const onDragOver = (event: DragEvent) => {
			const transfer = event.dataTransfer;
			if (!transfer || !hasFiles(transfer)) return;
			event.preventDefault();
			setDragPreview(peekTransfer(transfer));
		};

		const onDragLeave = (event: DragEvent) => {
			const transfer = event.dataTransfer;
			if (!transfer || !hasFiles(transfer)) return;
			event.preventDefault();
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) {
				setDragging(false);
				setDragPreview(null);
			}
		};

		const onDrop = (event: DragEvent) => {
			const transfer = event.dataTransfer;
			if (!transfer || !hasFiles(transfer)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setDragging(false);
			setDragPreview(null);
			void uploadFiles(collectFiles(transfer));
		};

		window.addEventListener("dragenter", onDragEnter);
		window.addEventListener("dragover", onDragOver);
		window.addEventListener("dragleave", onDragLeave);
		window.addEventListener("drop", onDrop);

		return () => {
			window.removeEventListener("dragenter", onDragEnter);
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("dragleave", onDragLeave);
			window.removeEventListener("drop", onDrop);
		};
	}, [uploadFiles]);

	const previewLabel =
		dragPreview && dragPreview.count > 0
			? `${dragPreview.count} file${dragPreview.count === 1 ? "" : "s"} · ${formatFileSize(dragPreview.totalBytes)}`
			: "drop files anywhere";

	return (
		<>
			{children}

			{dragging ? (
				<div
					className="pointer-events-none fixed inset-0 z-50 bg-drop-highlight transition-opacity duration-[var(--dur)]"
					aria-hidden
				>
					<div className="flex h-full items-center justify-center px-6">
						<p className="text-sm tracking-wide text-drop-highlight-text">{previewLabel}</p>
					</div>
				</div>
			) : null}
		</>
	);
}
