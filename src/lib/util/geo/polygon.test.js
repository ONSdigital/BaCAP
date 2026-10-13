import { describe, expect, it, vi } from "vitest";

vi.mock("../state/index.js", () => ({ get: vi.fn(), set: vi.fn(), update: vi.fn() }));

import Polygon from "./polygon.svelte.js";

const square = (x0, y0, x1, y1) => ({
	type: "Polygon",
	coordinates: [
		[
			[x0, y0],
			[x1, y0],
			[x1, y1],
			[x0, y1],
			[x0, y0]
		]
	]
});

describe("Polygon", () => {
	it("merges overlapping shapes when adding", () => {
		const polygon = new Polygon(square(0, 0, 1, 1));
		polygon.add(square(0.5, 0, 1.5, 1));

		expect(polygon.geometry.type).toBe("Polygon");
		expect(polygon.geometry.bbox).toEqual([0, 0, 1.5, 1]);
	});

	it("keeps what is left after erasing part of a shape", () => {
		const polygon = new Polygon(square(0, 0, 2, 1));
		polygon.subtract(square(1, -1, 3, 2));

		expect(polygon.geometry.bbox).toEqual([0, 0, 1, 1]);
	});

	it("clears the shape when the erased area covers all of it", () => {
		const polygon = new Polygon(square(0, 0, 1, 1));
		polygon.subtract(square(-1, -1, 2, 2));

		expect(polygon.geometry).toBeNull();
	});
});
