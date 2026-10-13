import { get as _get, set as _set, update as _update, del as _del, createStore } from "idb-keyval";

// IndexedDB can be unavailable or fail (eg. storage blocked, quota exceeded, some private modes).
// Storage failures are logged and otherwise ignored, so the app keeps working without persistence.
let store = null;
function getStore() {
	if (!store) store = createStore("bacap-db", "store");
	return store;
}

async function safely(fn, fallback = undefined) {
	try {
		return await fn(getStore());
	} catch (err) {
		console.warn("IndexedDB unavailable", err);
		return fallback;
	}
}

export const get = (key) => safely((s) => _get(key, s));
export const set = (key, val) => safely((s) => _set(key, val, s));
export const update = (key, fn) => safely((s) => _update(key, fn, s));
export const del = (key) => safely((s) => _del(key, s));
