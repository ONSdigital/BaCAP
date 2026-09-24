import { writable } from "svelte/store";
import { get, set } from "./db.js";
import snapshot from "./snapshot.svelte.js";
import { initialState, appVersion } from "../../config/index.js";

function syncState(key, val) {
	console.debug(`Syncing state: ${key}`, val);
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

async function initSyncedStore(key, fallbackValue = null) {
	let value = await get(key);
	if (!value) {
		value = fallbackValue;
		set(key, value);
	}
	return syncedStore(key, value);
}

export default async function getAppState() {
	const version = get("appVersion");
	if (version !== appVersion) {
		// Do something here if current app version doesn't match store
		set("appVersion", appVersion);
	}
	const keys = Object.keys(initialState);
	const stores = await Promise.all(keys.map((key) => initSyncedStore(key, initialState[key])));
	const appState = Object.fromEntries(keys.map((key, i) => [key, stores[i]]));

	return appState;
}
