import { resolve } from "$app/paths";

export async function load({ fetch }) {
	const topicsUrl = resolve("/data/legacy/topics.json");
	const topics = await (await fetch(topicsUrl)).json();

	return {
		topics
	};
}
