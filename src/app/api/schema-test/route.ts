import {
	createPair,
	getItemIndex,
	getPair,
	getStorageBindings,
	getTextContent,
	listItemsSince,
	setPairStatus,
	storeText,
} from "@/lib/storage";

const SESSION_KEY = "__relaypad_schema_test__";

export async function GET() {
	const bindings = getStorageBindings();

	await createPair(bindings, SESSION_KEY, "waiting");
	const waiting = await getPair(bindings, SESSION_KEY);

	await setPairStatus(bindings, SESSION_KEY, "paired");
	const paired = await getPair(bindings, SESSION_KEY);

	const small = await storeText(bindings, SESSION_KEY, "hello from inline kv");
	const smallContent = await getTextContent(
		bindings,
		SESSION_KEY,
		small.item.itemId,
		small.item.r2key,
	);

	const index = await getItemIndex(bindings, SESSION_KEY);
	const items = listItemsSince(index, -1);

	return Response.json({
		ok: true,
		pair: {
			kvKey: `pair:${SESSION_KEY}`,
			waiting: waiting?.status,
			paired: paired?.status,
		},
		items: {
			kvKey: `items:${SESSION_KEY}`,
			count: items.length,
			entries: items,
		},
		text: {
			inline: small.inline,
			content: smallContent,
		},
	});
}
