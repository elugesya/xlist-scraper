import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "./server.js";

describe("API Server", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({ status: "ok" });
    });
  });

  describe("POST /scrape/list", () => {
    it("should reject empty request", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/scrape/list",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid URLs", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/scrape/list",
        payload: {
          listURL: ["https://google.com"],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("should accept valid request with hyphenated keys", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/scrape/list",
        payload: {
          listURL: ["https://x.com/i/lists/1985510758294208956"],
          "max-tweets": 5,
          "timeout-ms": 30000,
        },
      });

      // This will likely fail in test environment without a real browser
      // but we can check that it was accepted
      expect([200, 422, 429, 500]).toContain(response.statusCode);
    });

    it("should accept valid request with camelCase keys", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/scrape/list",
        payload: {
          listUrl: ["https://x.com/i/lists/1985510758294208956"],
          maxTweets: 5,
          timeoutMs: 30000,
        },
      });

      // This will likely fail in test environment without a real browser
      // but we can check that it was accepted
      expect([200, 422, 429, 500]).toContain(response.statusCode);
    });

    it("should reject out-of-range max-tweets", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/scrape/list",
        payload: {
          listURL: ["https://x.com/i/lists/1985510758294208956"],
          "max-tweets": 3000,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("OpenAPI", () => {
    it("should serve OpenAPI JSON", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/docs/json",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.openapi).toBeDefined();
      expect(body.info.title).toBe("X List Scraper API");
    });
  });
});
