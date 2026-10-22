export function sleep(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function slugify(str) {
	return str.toLowerCase().replaceAll(" ", "-");
}

export function ascending(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}

export function descending(a, b) {
	return b < a ? -1 : b > a ? 1 : 0;
}

// Parses a "major.minor" version string (eg. the app's appVersion) into [major, minor] numbers, or
// null if it isn't in that exact shape - including a non-string value, such as a plain number left
// over from before this format was adopted.
function parseVersion(version) {
	const match = typeof version === "string" && version.match(/^(\d+)\.(\d+)$/);
	return match ? [Number(match[1]), Number(match[2])] : null;
}

// Compares two "major.minor" version strings numerically, so "1.12" is greater than "1.2" (a plain
// string comparison would get this backwards). An invalid version is always older than a valid one;
// two invalid versions compare as equal. Returns -1, 0 or 1, for use with <, > or === 0.
export function compareVersions(a, b) {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
	return ascending(pa[0], pb[0]) || ascending(pa[1], pb[1]);
}

export function round(num, precision = 0) {
	const multiplier = Math.pow(10, precision);
	return Math.round(num * multiplier) / multiplier;
}

// Recursive function to round numbers in a multi-array (used to round coordinates)
export function roundAll(arr, decimals) {
	let newarr = [];
	arr.forEach((d) => {
		if (typeof d == "number") {
			newarr.push(round(d, decimals));
		} else if (Array.isArray(d)) {
			newarr.push(roundAll(d, decimals));
		} else {
			newarr.push(d);
		}
	});
	return newarr;
}

export function focusChildInput(el) {
	const input = el.getElementsByTagName("input")?.[0];
	if (input) input.focus();
}
