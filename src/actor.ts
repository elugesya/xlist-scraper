/**
 * Apify Actor entrypoint
 * Reads input, scrapes Twitter/X lists, and pushes results to dataset
 */

import { scrapeList } from "./scraper/scrapeList.js";
import type { Tweet } from "./types.js";

interface ApifyInput {
  listURLs: string[];
  maxTweets?: number;
  timeoutMs?: number;
  headless?: boolean;
  proxy?: string;
  persistCookiesPath?: string;
  partialOk?: boolean;
}

interface ApifyContext {
  input: ApifyInput;
  pushData: (data: unknown) => Promise<void>;
  log: {
    info: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
  };
}

/**
 * Get Apify context (works both with SDK and without)
 */
function getApifyContext(): ApifyContext | null {
  // Check if running in Apify environment
  if (!process.env.APIFY_IS_AT_HOME) {
    return null;
  }

  // Read input from environment
  const inputStr = process.env.APIFY_INPUT_VALUE || "{}";
  const input: ApifyInput = JSON.parse(inputStr);

  return {
    input,
    pushData: async (data: unknown) => {
      // Push to stdout in Apify format
      console.log(JSON.stringify({ data }, null, 2));
    },
    log: {
      info: (msg: string) => console.log(`INFO: ${msg}`),
      error: (msg: string) => console.error(`ERROR: ${msg}`),
      warning: (msg: string) => console.warn(`WARNING: ${msg}`),
    },
  };
}

/**
 * Main Actor handler
 */
async function main() {
  console.log("🚀 Starting xlist-scraper Actor...");

  const context = getApifyContext();

  if (!context) {
    console.error("❌ Not running in Apify environment");
    console.error("Set APIFY_IS_AT_HOME=1 and APIFY_INPUT_VALUE to test locally");
    process.exit(1);
  }

  const { input, pushData, log } = context;

  // Validate input
  if (!input.listURLs || input.listURLs.length === 0) {
    log.error("No listURLs provided in input");
    process.exit(1);
  }

  log.info(`Processing ${input.listURLs.length} list(s)`);
  log.info(`Max tweets: ${input.maxTweets || 200}`);
  log.info(`Timeout: ${input.timeoutMs || 60000}ms`);
  log.info(`Headless: ${input.headless !== false}`);

  const results: Array<{
    listURL: string;
    tweets: Tweet[];
    error?: string;
  }> = [];

  // Process each list
  for (const listURL of input.listURLs) {
    try {
      log.info(`Scraping: ${listURL}`);

      const tweets = await scrapeList(listURL, {
        maxTweets: input.maxTweets || 200,
        timeoutMs: input.timeoutMs || 60000,
        headless: input.headless !== false,
        proxy: input.proxy || "",
        persistCookiesPath: input.persistCookiesPath || "",
        partialOk: input.partialOk || false,
      });

      log.info(`✓ Scraped ${tweets.length} tweets from ${listURL}`);

      // Push each tweet to dataset with source URL
      for (const tweet of tweets) {
        await pushData({
          ...tweet,
          sourceListURL: listURL,
        });
      }

      results.push({
        listURL,
        tweets,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log.error(`Failed to scrape ${listURL}: ${errorMessage}`);

      results.push({
        listURL,
        tweets: [],
        error: errorMessage,
      });

      // Continue with other lists unless it's a critical error
      if (errorMessage.includes("LOGIN_REQUIRED") && input.listURLs.length === 1) {
        log.error("Login required and only one list specified, exiting");
        process.exit(1);
      }
    }
  }

  // Summary
  const totalTweets = results.reduce((sum, r) => sum + r.tweets.length, 0);
  const failedLists = results.filter((r) => r.error).length;

  log.info(`\n✨ Scraping complete!`);
  log.info(`Total tweets: ${totalTweets}`);
  log.info(`Successful lists: ${results.length - failedLists}/${results.length}`);

  if (failedLists > 0) {
    log.warning(`Failed lists: ${failedLists}`);
    results
      .filter((r) => r.error)
      .forEach((r) => {
        log.warning(`  - ${r.listURL}: ${r.error}`);
      });
  }

  console.log("✓ Actor finished");
}

// Run the actor
main().catch((error) => {
  console.error("❌ Actor failed:");
  console.error(error);
  process.exit(1);
});
