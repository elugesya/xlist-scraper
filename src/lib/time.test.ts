import { describe, it, expect } from "vitest";
import { formatTwitterTimestamp, parseTwitterDate, parseRelativeTime } from "./time.js";

describe("formatTwitterTimestamp", () => {
  it("should format date in Twitter format", () => {
    const date = new Date(Date.UTC(2025, 10, 4, 19, 6, 32)); // Nov 4, 2025
    const formatted = formatTwitterTimestamp(date);
    expect(formatted).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) Nov 04 19:06:32 \+0000 2025$/);
  });

  it("should pad single-digit values", () => {
    const date = new Date(Date.UTC(2025, 0, 5, 8, 5, 3)); // Jan 5, 2025
    const formatted = formatTwitterTimestamp(date);
    expect(formatted).toMatch(/05 08:05:03/);
  });
});

describe("parseTwitterDate", () => {
  it("should parse ISO date format", () => {
    const isoString = "2025-11-04T19:06:32.000Z";
    const date = parseTwitterDate(isoString);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(date.getUTCDate()).toBe(4);
  });

  it("should parse Twitter native format", () => {
    const twitterFormat = "Tue Nov 04 19:06:32 +0000 2025";
    const date = parseTwitterDate(twitterFormat);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(10);
    expect(date.getUTCDate()).toBe(4);
    expect(date.getUTCHours()).toBe(19);
  });
});

describe("parseRelativeTime", () => {
  it("should parse seconds", () => {
    const now = Date.now();
    const date = parseRelativeTime("30s");
    const diff = now - date.getTime();
    expect(diff).toBeGreaterThanOrEqual(29000);
    expect(diff).toBeLessThanOrEqual(31000);
  });

  it("should parse minutes", () => {
    const now = Date.now();
    const date = parseRelativeTime("5m");
    const diff = now - date.getTime();
    expect(diff).toBeGreaterThanOrEqual(4 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(6 * 60 * 1000);
  });

  it("should parse hours", () => {
    const now = Date.now();
    const date = parseRelativeTime("2h");
    const diff = now - date.getTime();
    expect(diff).toBeGreaterThanOrEqual(1.9 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(2.1 * 60 * 60 * 1000);
  });

  it("should parse days", () => {
    const now = Date.now();
    const date = parseRelativeTime("3d");
    const diff = now - date.getTime();
    expect(diff).toBeGreaterThanOrEqual(2.9 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(3.1 * 24 * 60 * 60 * 1000);
  });
});
