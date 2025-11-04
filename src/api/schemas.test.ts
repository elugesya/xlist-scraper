import { describe, it, expect } from "vitest";
import { scrapeListRequestSchema, normalizeRequest } from "./schemas.js";

describe("scrapeListRequestSchema", () => {
  it("should validate valid request with listURL", () => {
    const request = {
      listURL: ["https://x.com/i/lists/1985510758294208956"],
      "max-tweets": 50,
      "timeout-ms": 60000,
    };

    const result = scrapeListRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("should validate valid request with camelCase", () => {
    const request = {
      listUrl: ["https://x.com/i/lists/1985510758294208956"],
      maxTweets: 50,
      timeoutMs: 60000,
    };

    const result = scrapeListRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("should accept mixed hyphenated and camelCase", () => {
    const request = {
      listURL: ["https://x.com/i/lists/1985510758294208956"],
      "max-tweets": 50,
      timeoutMs: 60000,
    };

    const result = scrapeListRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URLs", () => {
    const request = {
      listURL: ["https://google.com"],
    };

    const result = scrapeListRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("should reject empty listURL array", () => {
    const request = {
      listURL: [],
    };

    const result = scrapeListRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("should reject out of range values", () => {
    const request1 = {
      listURL: ["https://x.com/i/lists/123"],
      "max-tweets": 3000, // Too high
    };

    expect(scrapeListRequestSchema.safeParse(request1).success).toBe(false);

    const request2 = {
      listURL: ["https://x.com/i/lists/123"],
      "timeout-ms": 5000, // Too low
    };

    expect(scrapeListRequestSchema.safeParse(request2).success).toBe(false);
  });
});

describe("normalizeRequest", () => {
  it("should prefer hyphenated keys over camelCase", () => {
    const request = {
      listURL: ["https://x.com/i/lists/123"],
      listUrl: ["https://x.com/i/lists/999"],
      "max-tweets": 100,
      maxTweets: 200,
      "timeout-ms": 30000,
      timeoutMs: 40000,
    };

    const normalized = normalizeRequest(request);

    expect(normalized.listURLs).toEqual(["https://x.com/i/lists/123"]);
    expect(normalized.maxTweets).toBe(100);
    expect(normalized.timeoutMs).toBe(30000);
  });

  it("should use defaults when values not provided", () => {
    const request = {
      listURL: ["https://x.com/i/lists/123"],
    };

    const normalized = normalizeRequest(request);

    expect(normalized.maxTweets).toBe(200);
    expect(normalized.timeoutMs).toBe(60000);
  });

  it("should use camelCase when hyphenated not provided", () => {
    const request = {
      listUrl: ["https://x.com/i/lists/123"],
      maxTweets: 150,
      timeoutMs: 50000,
    };

    const normalized = normalizeRequest(request);

    expect(normalized.listURLs).toEqual(["https://x.com/i/lists/123"]);
    expect(normalized.maxTweets).toBe(150);
    expect(normalized.timeoutMs).toBe(50000);
  });
});
