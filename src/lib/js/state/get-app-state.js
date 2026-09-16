import { writable } from "svelte/store";
import { get, set } from "./db.js";
import snapshot from "./snapshot.svelte.js";
import { initialState, appVersion } from "../config";

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
			syncState(key, snapshot(val));
		},
		update
	};
}

export default async function getAppState() {
	const version = get("appVersion");
	if (version !== appVersion) {
		// Do something here if current app version doesn't match store
		set("appVersion", appVersion);
	}
	const keys = Object.keys(initialState);
	const storedState = await Promise.all(keys.map((key) => get(key)));
	const appState = Object.fromEntries(
		keys.map((key, i) => [key, syncedStore(key, storedState[i] || initialState[key])])
	);

	return appState;
}
