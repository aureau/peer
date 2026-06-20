"use client";

import { useReceivedItems } from "@/lib/items/useReceivedItems";
import { ReceivedItemCard } from "./ReceivedItemCard";

type ReceivedListProps = {
	sessionKey: string;
	receiveSinceSeq: number;
};

/** received items for the current receiver stint, newest first */
export function ReceivedList({ sessionKey, receiveSinceSeq }: ReceivedListProps) {
	const { items, error } = useReceivedItems(sessionKey, receiveSinceSeq);

	return (
		<div className="flex w-full flex-col gap-4">
			{items.length === 0 ? (
				<div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-ring px-6 py-10">
					<p className="text-sm text-muted/80">waiting for items…</p>
				</div>
			) : (
				<ul className="flex w-full flex-col gap-3">
					{items.map((item) => (
						<ReceivedItemCard key={item.itemId} sessionKey={sessionKey} item={item} />
					))}
				</ul>
			)}

			{error ? (
				<p className="animate-fade-in text-center text-sm text-status-lost" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
