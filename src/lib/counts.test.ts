import { describe, it, expect } from "vitest";
import { parseCount } from "./counts.js";

describe("parseCount", () => {
  it("should parse plain numbers", () => {
    expect(parseCount("123")).toBe(123);
    expect(parseCount("0")).toBe(0);
    expect(parseCount("999999")).toBe(999999);
  });

  it("should parse numbers with K suffix", () => {
    expect(parseCount("1K")).toBe(1000);
    expect(parseCount("1.2K")).toBe(1200);
    expect(parseCount("5.5K")).toBe(5500);
    expect(parseCount("10K")).toBe(10000);
  });

  it("should parse numbers with M suffix", () => {
    expect(parseCount("1M")).toBe(1000000);
    expect(parseCount("2.5M")).toBe(2500000);
    expect(parseCount("10.7M")).toBe(10700000);
  });

  it("should parse numbers with B suffix", () => {
    expect(parseCount("1B")).toBe(1000000000);
    expect(parseCount("2.3B")).toBe(2300000000);
  });

  it("should handle comma-separated numbers", () => {
    expect(parseCount("1,234")).toBe(1234);
    expect(parseCount("1,234,567")).toBe(1234567);
  });

  it("should handle lowercase suffixes", () => {
    expect(parseCount("1k")).toBe(1000);
    expect(parseCount("2.5m")).toBe(2500000);
  });

  it("should return 0 for invalid inputs", () => {
    expect(parseCount("")).toBe(0);
    expect(parseCount("-")).toBe(0);
    expect(parseCount("abc")).toBe(0);
    expect(parseCount(null)).toBe(0);
    expect(parseCount(undefined)).toBe(0);
  });

  it("should handle whitespace", () => {
    expect(parseCount("  123  ")).toBe(123);
    expect(parseCount(" 1.2K ")).toBe(1200);
  });
});
