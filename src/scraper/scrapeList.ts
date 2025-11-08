import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Tweet, ScrapeOptions } from "../types.js";
import { normalizeListUrl } from "../lib/url.js";
import {
  parseTweetElement,
  waitForTweets,
  scrollToLoadMore,
  isEndOfFeed,
  getTweetArticles,
  checkForBlockers,
} from "./domParsers.js";
import fs from "fs/promises";
import path from "path";

const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  maxTweets: 200,
  timeoutMs: 60000,
  headless: true,
  persistCookiesPath: "",
  proxy: "",
  partialOk: false,
};

/**
 * Scrape tweets from a Twitter/X list
 */
export async function scrapeList(
  url: string,
  options: ScrapeOptions = {}
): Promise<Tweet[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedUrl = normalizeListUrl(url);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: opts.headless,
    };

    if (opts.proxy) {
      launchOptions.proxy = {
        server: opts.proxy,
      };
    }

    browser = await chromium.launch(launchOptions);

    // Create context with optional cookies
    const contextOptions: Parameters<Browser["newContext"]>[0] = {
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    // Load cookies if path provided
    if (opts.persistCookiesPath) {
      try {
        const cookiesData = await fs.readFile(opts.persistCookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesData);
        contextOptions.storageState = { cookies, origins: [] };
      } catch (error) {
        // Cookies file doesn't exist or is invalid, continue without
        console.warn("Could not load cookies, continuing without authentication");
      }
    }

    context = await browser.newContext(contextOptions);
    page = await context.newPage();

    // Set timeout
    page.setDefaultTimeout(opts.timeoutMs);

    // Navigate to the list
    await page.goto(normalizedUrl, { waitUntil: "networkidle" });

    // Check for blockers
    const blockerCheck = await checkForBlockers(page);
    if (blockerCheck.blocked) {
      if (blockerCheck.reason === "RATE_LIMIT") {
        throw new Error("RATE_LIMIT: Twitter is rate limiting requests");
      } else if (blockerCheck.reason === "LOGIN_REQUIRED") {
        throw new Error(
          "LOGIN_REQUIRED: Twitter requires login. Provide cookies via persistCookiesPath"
        );
      }
    }

    // Wait for initial tweets to load (progressively increase wait)
    let loaded = await waitForTweets(page, 12000);
    if (!loaded) {
      await scrollToLoadMore(page);
      loaded = await waitForTweets(page, 8000);
    }
    if (!loaded) {
      throw new Error("No tweets found on the page. The list may be empty or private.");
    }

    // Scrape tweets
    const tweets: Tweet[] = [];
    const seenIds = new Set<string>();
    let consecutiveNoNewTweets = 0;
    const maxConsecutiveScrolls = 5;

    while (tweets.length < opts.maxTweets) {
      // Get current tweet articles
      const articles = await getTweetArticles(page);

      let newTweetsFound = 0;

      // Parse each article
      for (const article of articles) {
        if (tweets.length >= opts.maxTweets) {
          break;
        }

        const tweet = await parseTweetElement(article);

        if (tweet && !seenIds.has(tweet.id)) {
          seenIds.add(tweet.id);
          tweets.push(tweet);
          newTweetsFound++;
        }
      }

      // Check if we should continue scrolling
      if (tweets.length >= opts.maxTweets) {
        break;
      }

      // Check if we've reached the end
      const endReached = await isEndOfFeed(page);
      if (endReached) {
        break;
      }

      // If no new tweets were found, increment counter
      if (newTweetsFound === 0) {
        consecutiveNoNewTweets++;
        if (consecutiveNoNewTweets >= maxConsecutiveScrolls) {
          // No new tweets after multiple scrolls, likely reached the end
          break;
        }
      } else {
        consecutiveNoNewTweets = 0;
      }

      // Scroll to load more
      await scrollToLoadMore(page);

      // Small delay to avoid overwhelming the page
      await page.waitForTimeout(500);
    }

    // Save cookies if path provided
    if (opts.persistCookiesPath && context) {
      try {
        const cookies = await context.cookies();
        await fs.mkdir(path.dirname(opts.persistCookiesPath), { recursive: true });
        await fs.writeFile(opts.persistCookiesPath, JSON.stringify(cookies, null, 2));
      } catch (error) {
        console.warn("Could not save cookies:", error);
      }
    }

    // Sort by created date (newest first)
    tweets.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return tweets;
  } catch (error) {
    if (opts.partialOk && error instanceof Error) {
      // Return partial results if allowed
      console.error("Scraping error (returning partial results):", error.message);
      return [];
    }
    throw error;
  } finally {
    // Cleanup
    try {
      await page?.close();
      await context?.close();
      await browser?.close();
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
  }
}

/**
 * Scrape multiple lists and merge results
 */
export async function scrapeMultipleLists(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<Array<{ url: string; tweets: Tweet[]; error?: string }>> {
  const results: Array<{ url: string; tweets: Tweet[]; error?: string }> = [];

  for (const url of urls) {
    try {
      const tweets = await scrapeList(url, options);
      results.push({ url, tweets });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({ url, tweets: [], error: errorMessage });
    }
  }

  return results;
}
