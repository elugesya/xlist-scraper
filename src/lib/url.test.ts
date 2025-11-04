import { describe, it, expect } from "vitest";
import {
  isValidListUrl,
  extractListId,
  normalizeListUrl,
  extractTweetId,
} from "./url.js";

describe("isValidListUrl", () => {
  it("should validate x.com list URLs", () => {
    expect(isValidListUrl("https://x.com/i/lists/1985510758294208956")).toBe(true);
    expect(isValidListUrl("https://x.com/i/lists/123456789")).toBe(true);
  });

  it("should validate twitter.com list URLs", () => {
    expect(isValidListUrl("https://twitter.com/i/lists/1985510758294208956")).toBe(true);
  });

  it("should reject non-HTTPS URLs", () => {
    expect(isValidListUrl("http://x.com/i/lists/123")).toBe(false);
  });

  it("should reject URLs without /i/lists/", () => {
    expect(isValidListUrl("https://x.com/user/status/123")).toBe(false);
    expect(isValidListUrl("https://x.com/")).toBe(false);
  });

  it("should reject invalid URLs", () => {
    expect(isValidListUrl("not-a-url")).toBe(false);
    expect(isValidListUrl("")).toBe(false);
  });
});

describe("extractListId", () => {
  it("should extract list ID from URL", () => {
    expect(extractListId("https://x.com/i/lists/1985510758294208956")).toBe(
      "1985510758294208956"
    );
    expect(extractListId("https://twitter.com/i/lists/123456789")).toBe("123456789");
  });

  it("should return null for invalid URLs", () => {
    expect(extractListId("https://x.com/user/status/123")).toBe(null);
    expect(extractListId("not-a-url")).toBe(null);
  });
});

describe("normalizeListUrl", () => {
  it("should convert twitter.com to x.com", () => {
    expect(normalizeListUrl("https://twitter.com/i/lists/123")).toBe(
      "https://x.com/i/lists/123"
    );
    expect(normalizeListUrl("https://www.twitter.com/i/lists/123")).toBe(
      "https://x.com/i/lists/123"
    );
  });

  it("should normalize www.x.com to x.com", () => {
    expect(normalizeListUrl("https://www.x.com/i/lists/123")).toBe(
      "https://x.com/i/lists/123"
    );
  });

  it("should keep x.com URLs unchanged", () => {
    const url = "https://x.com/i/lists/123";
    expect(normalizeListUrl(url)).toBe(url);
  });
});

describe("extractTweetId", () => {
  it("should extract tweet ID from full URL", () => {
    expect(extractTweetId("https://x.com/user/status/1234567890")).toBe("1234567890");
    expect(extractTweetId("https://twitter.com/user/status/9876543210")).toBe(
      "9876543210"
    );
  });

  it("should extract tweet ID from path", () => {
    expect(extractTweetId("/user/status/1234567890")).toBe("1234567890");
  });

  it("should return null for invalid inputs", () => {
    expect(extractTweetId("https://x.com/user")).toBe(null);
    expect(extractTweetId("not-a-url")).toBe(null);
  });
});
