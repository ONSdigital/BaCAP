import { describe, expect, it } from "vitest";

import { compareVersions } from "./index.js";

describe("compareVersions", () => {
	it("treats equal major.minor versions as equal", () => {
		expect(compareVersions("1.0", "1.0")).toBe(0);
	});

	it("compares minor versions numerically, not as strings", () => {
		expect(compareVersions("1.12", "1.2")).toBeGreaterThan(0);
		expect(compareVersions("1.2", "1.12")).toBeLessThan(0);
	});

	it("compares major versions before minor versions", () => {
		expect(compareVersions("2.0", "1.12")).toBeGreaterThan(0);
		expect(compareVersions("1.0", "2.0")).toBeLessThan(0);
	});

	it("treats an invalid version as older than a valid one", () => {
		expect(compareVersions(1, "1.0")).toBeLessThan(0); // a raw number, eg. the pre-"major.minor" format
		expect(compareVersions("1.0", 1)).toBeGreaterThan(0);
		expect(compareVersions(null, "1.0")).toBeLessThan(0); // no stored version yet
		expect(compareVersions("1.0.1", "1.0")).toBeLessThan(0); // not exactly "major.minor"
		expect(compareVersions("1.a", "1.0")).toBeLessThan(0);
	});

	it("treats two invalid versions as equal", () => {
		expect(compareVersions(1, 2)).toBe(0);
		expect(compareVersions(undefined, undefined)).toBe(0);
	});
});
