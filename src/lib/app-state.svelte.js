import { writable } from "svelte/store";
import { get, set } from "./db.js";
import { initialState } from "./config.js";

function syncState(key, val) {
	console.log(`Syncing state: ${key}`, val);
	set(key, val);
}

function syncedStore(key, initialValue = null) {
	const { set, update, subscribe } = writable(initialValue);

	return {
		subscribe,
		set: (val) => {
			set(val);
			syncState(key, $state.snapshot(val));
		},
		update
	};
}

export default async function getAppState() {
	const keys = Object.keys(initialState);
	const storedState = await Promise.all(keys.map((key) => get(key)));
	const appState = Object.fromEntries(
		keys.map((key, i) => [key, syncedStore(key, storedState[i] || initialState[key])])
	);

	return appState;
}
