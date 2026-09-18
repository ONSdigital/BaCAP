import * as env from "$env/static/public";
import { resolve } from "$app/paths";

export const prerender = env?.PUBLIC_APP_ENV !== "preview";
export const trailingSlash = "always";

export async function load({ fetch }) {
	const topicsUrl = resolve("/data/topics.json");
	const topics = await (await fetch(topicsUrl)).json();

	return {
		topics
	};
}
