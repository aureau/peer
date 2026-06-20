"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import { itemDownloadUrl } from "@/lib/items/api";
import type { ReceivedItem } from "@/lib/items/types";
import { formatFileSize } from "@/lib/format";

type ReceivedItemCardProps = {
	sessionKey: string;
	item: ReceivedItem;
};

const cardClass =
	"animate-rise-in flex flex-col gap-3 rounded-2xl bg-button/60 px-5 py-4 ring-1 ring-ring/40";

const downloadLinkClass =
	"inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm tracking-wide " +
	"text-muted transition-colors duration-[var(--dur)] hover:text-foreground " +
	"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60";

function TextItem({ content }: { content: string }) {
	return (
		<>
			<pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-foreground">
				{content}
			</pre>
			<div className="flex justify-end">
				<CopyButton value={content} />
			</div>
		</>
	);
}

function FileItem({ sessionKey, item }: { sessionKey: string; item: ReceivedItem }) {
	const name = item.name ?? "download";
	return (
		<>
			<div className="flex flex-col gap-1">
				<span className="break-all font-mono text-sm text-foreground">{name}</span>
				<span className="text-xs text-muted">
					{formatFileSize(item.size ?? 0)}
					{item.relativePath ? ` · ${item.relativePath}` : ""}
				</span>
			</div>
			<div className="flex justify-end">
				<a
					className={downloadLinkClass}
					href={itemDownloadUrl(sessionKey, item.itemId)}
					download={name}
				>
					Download
				</a>
			</div>
		</>
	);
}

export function ReceivedItemCard({ sessionKey, item }: ReceivedItemCardProps) {
	return (
		<li className={cardClass}>
			{item.type === "text" ? (
				<TextItem content={item.content ?? ""} />
			) : (
				<FileItem sessionKey={sessionKey} item={item} />
			)}
		</li>
	);
}
