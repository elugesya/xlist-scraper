import { z } from "zod";

// URL validation for Twitter/X lists
const isValidListUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const isValidHost =
      parsed.hostname === "x.com" ||
      parsed.hostname === "twitter.com" ||
      parsed.hostname === "www.x.com" ||
      parsed.hostname === "www.twitter.com";
    const hasListPath = parsed.pathname.includes("/i/lists/");
    return isValidHost && hasListPath && parsed.protocol === "https:";
  } catch {
    return false;
  }
};

// Request schema with support for both hyphenated and camelCase
export const scrapeListRequestSchema = z
  .object({
    listURL: z.array(z.string()).optional(),
    listUrl: z.array(z.string()).optional(),
    "max-tweets": z.number().int().min(1).max(2000).optional(),
    maxTweets: z.number().int().min(1).max(2000).optional(),
    "timeout-ms": z.number().int().min(10000).max(300000).optional(),
    timeoutMs: z.number().int().min(10000).max(300000).optional(),
  })
  .refine((data) => data.listURL || data.listUrl, {
    message: "Either listURL or listUrl must be provided",
  })
  .refine(
    (data) => {
      const urls = data.listURL || data.listUrl || [];
      return urls.length > 0;
    },
    {
      message: "At least one list URL must be provided",
    }
  )
  .refine(
    (data) => {
      const urls = data.listURL || data.listUrl || [];
      return urls.every(isValidListUrl);
    },
    {
      message:
        "All URLs must be valid HTTPS URLs to x.com or twitter.com containing /i/lists/",
    }
  );

export type ScrapeListRequestSchema = z.infer<typeof scrapeListRequestSchema>;

// Normalized request after processing hyphenated vs camelCase
export type NormalizedScrapeRequest = {
  listURLs: string[];
  maxTweets: number;
  timeoutMs: number;
};

export function normalizeRequest(
  raw: ScrapeListRequestSchema
): NormalizedScrapeRequest {
  // Hyphenated keys take precedence
  const listURLs = raw.listURL || raw.listUrl || [];
  const maxTweets = raw["max-tweets"] ?? raw.maxTweets ?? 200;
  const timeoutMs = raw["timeout-ms"] ?? raw.timeoutMs ?? 60000;

  return { listURLs, maxTweets, timeoutMs };
}

// Tweet schema
export const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  retweetCount: z.number().int().min(0),
  replyCount: z.number().int().min(0),
  likeCount: z.number().int().min(0),
  quoteCount: z.number().int().min(0),
  createdAt: z.string(),
  bookmarkCount: z.number().int().min(0),
  isRetweet: z.boolean(),
  isQuote: z.boolean(),
});

// API Tweet schema
export const apiTweetSchema = tweetSchema.extend({
  sourceListURL: z.string(),
});

// Response schemas
export const successResponseSchema = z.object({
  ok: z.literal(true),
  count: z.number(),
  items: z.array(apiTweetSchema),
});

export const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.array(z.any()).optional(),
  items: z.array(apiTweetSchema).optional(),
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});
