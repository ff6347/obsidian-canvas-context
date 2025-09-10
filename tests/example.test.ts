import { describe, it, expect } from "vitest";

// Basic example test to verify Vitest setup
describe("Example Test Suite", () => {
	it("should pass basic test", () => {
		expect(1 + 1).toBe(2);
	});

	it("should work with async tests", async () => {
		const result = await Promise.resolve(42);
		expect(result).toBe(42);
	});

	it("should handle objects", () => {
		const obj = { name: "test", value: 123 };
		expect(obj).toEqual({ name: "test", value: 123 });
	});
});
