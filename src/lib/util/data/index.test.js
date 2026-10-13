import { describe, expect, it, vi } from "vitest";

vi.mock("../state/index.js", () => ({ get: vi.fn(), set: vi.fn(), update: vi.fn() }));

import { pivotDataOnMeasures } from "./index.js";
import { cleanBase64, btoaUtf8, atobUtf8 } from "../io/index.js";
import { getName } from "../geo/index.js";

describe("pivotDataOnMeasures", () => {
	it("keeps areas that share a name separate", () => {
		const data = [
			{
				areacd: "E07000032",
				areanm: "Amber Valley",
				category: "All",
				date: "2024",
				measure: "Value",
				value: 1
			},
			{
				areacd: "E14001066",
				areanm: "Amber Valley",
				category: "All",
				date: "2024",
				measure: "Value",
				value: 2
			}
		];

		expect(pivotDataOnMeasures(data).map((d) => [d.areacd, d.value])).toEqual([
			["E07000032", 1],
			["E14001066", 2]
		]);
	});
});

describe("cleanBase64", () => {
	it("restores base64 that has been URL-encoded or had + turned into spaces", () => {
		const hash = btoaUtf8(JSON.stringify({ name: "Ynys Môn ~~>>" }));
		expect(hash).toMatch(/[+=]/); // sanity check on the fixture
		const mangled = encodeURIComponent(hash).replaceAll("%2B", " ");

		expect(JSON.parse(atobUtf8(cleanBase64(mangled)))).toEqual({ name: "Ynys Môn ~~>>" });
	});
});

describe("getName", () => {
	it("always returns a string", () => {
		expect(getName({ type: "Feature", properties: {} })).toBe("Unnamed Area");
		expect(getName({ properties: { areanm: "Hartlepool" } })).toBe("Hartlepool");
		expect(getName("area-collection")).toBe("area-collection");
		expect(getName(null)).toBe("Unnamed Area");
	});
});
