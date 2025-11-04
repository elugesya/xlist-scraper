import type { FastifyInstance } from "fastify";
import { scrapeList } from "../scraper/scrapeList.js";
import type { ApiTweet } from "../types.js";
import {
  scrapeListRequestSchema,
  normalizeRequest,
  type ScrapeListRequestSchema,
} from "./schemas.js";
import { ZodError } from "zod";
import pLimit from "p-limit";

const CONCURRENCY = parseInt(process.env.CONCURRENCY || "1", 10);
const HEADLESS = process.env.HEADLESS !== "false";
const PERSIST_COOKIES_PATH = process.env.PERSIST_COOKIES_PATH || "";
const PROXY = process.env.PROXY || "";

/**
 * Register API routes
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get("/health", async (request, reply) => {
    return { status: "ok" };
  });

  // Main scraping endpoint
  fastify.post<{
    Body: ScrapeListRequestSchema;
  }>("/scrape/list", async (request, reply) => {
    try {
      // Validate request body
      const validatedBody = scrapeListRequestSchema.parse(request.body);

      // Normalize request (handle hyphenated vs camelCase)
      const { listURLs, maxTweets, timeoutMs } = normalizeRequest(validatedBody);

      fastify.log.info(
        `Scraping ${listURLs.length} list(s) with maxTweets=${maxTweets}, timeoutMs=${timeoutMs}`
      );

      // Set up concurrency limiter
      const limit = pLimit(CONCURRENCY);

      // Scrape all lists with concurrency control
      const scrapePromises = listURLs.map((url) =>
        limit(async () => {
          try {
            fastify.log.info(`Starting scrape for: ${url}`);
            const tweets = await scrapeList(url, {
              maxTweets,
              timeoutMs,
              headless: HEADLESS,
              persistCookiesPath: PERSIST_COOKIES_PATH,
              proxy: PROXY,
              partialOk: false,
            });

            fastify.log.info(`Scraped ${tweets.length} tweets from: ${url}`);

            // Add sourceListURL to each tweet
            const apiTweets: ApiTweet[] = tweets.map((tweet) => ({
              ...tweet,
              sourceListURL: url,
            }));

            return { url, tweets: apiTweets, error: null };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            fastify.log.error(`Error scraping ${url}: ${errorMessage}`);

            // Check for specific error types
            if (errorMessage.includes("RATE_LIMIT")) {
              throw { type: "RATE_LIMIT", message: errorMessage };
            } else if (errorMessage.includes("LOGIN_REQUIRED")) {
              throw { type: "RATE_LIMIT", message: errorMessage };
            }

            return { url, tweets: [], error: errorMessage };
          }
        })
      );

      const results = await Promise.all(scrapePromises);

      // Collect all tweets and errors
      const allTweets: ApiTweet[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.error) {
          errors.push(`${result.url}: ${result.error}`);
        } else {
          allTweets.push(...result.tweets);
        }
      }

      // Sort all tweets by createdAt (newest first)
      allTweets.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Return response
      if (errors.length > 0 && allTweets.length === 0) {
        // All scrapes failed
        return reply.status(500).send({
          ok: false,
          error: "INTERNAL",
          message: "All scraping attempts failed",
          details: errors,
        });
      } else if (errors.length > 0) {
        // Some scrapes failed (partial results)
        return reply.status(422).send({
          ok: false,
          error: "PARTIAL_RESULTS",
          items: allTweets,
          details: errors,
        });
      } else {
        // Success
        return reply.status(200).send({
          ok: true,
          count: allTweets.length,
          items: allTweets,
        });
      }
    } catch (error) {
      // Handle rate limit errors
      if (error && typeof error === "object" && "type" in error) {
        const err = error as { type: string; message: string };
        if (err.type === "RATE_LIMIT") {
          return reply.status(429).send({
            ok: false,
            error: "RATE_LIMIT",
            message: err.message,
          });
        }
      }

      // Handle validation errors
      if (error instanceof ZodError) {
        return reply.status(400).send({
          ok: false,
          error: "VALIDATION_ERROR",
          details: error.errors,
        });
      }

      // Handle other errors
      fastify.log.error("Unexpected error:", error);
      return reply.status(500).send({
        ok: false,
        error: "INTERNAL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
