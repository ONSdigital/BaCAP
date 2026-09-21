export function sleep(ms = 0) {
	return new Promise((resolve) => setInterval(() => resolve(), ms));
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
