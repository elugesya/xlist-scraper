/**
 * Apify Actor entrypoint using official SDK
 */
import { Actor, Dataset, log } from "apify";
import { scrapeList } from "./scraper/scrapeList.js";
import type { Tweet } from "./types.js";

interface ApifyInput {
  listURLs: string[];
  maxTweets?: number;
  timeoutMs?: number;
  headless?: boolean;
  proxy?: string;
  useApifyProxy?: boolean;
  proxyGroups?: string[];
  persistCookiesPath?: string;
  cookiesKey?: string;
  partialOk?: boolean;
}

// SDK handles input and dataset IO reliably on Apify

/**
 * Main Actor handler
 */
async function main() {
  await Actor.init();
  log.info("🚀 Starting xlist-scraper Actor...");

  const input = (await Actor.getInput<ApifyInput>()) || ({} as ApifyInput);

  // Validate input
  if (!input.listURLs || input.listURLs.length === 0) {
    log.error("No listURLs provided in input");
  await Actor.exit({ exitCode: 1 });
    return;
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

  // If cookies are provided via KV store, save to file
  if (input.cookiesKey) {
    try {
      const cookies = await Actor.getValue(input.cookiesKey);
      if (cookies) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const cookiePath = input.persistCookiesPath || "/data/cookies.json";
        await fs.mkdir(path.dirname(cookiePath), { recursive: true });
        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        log.info(`Loaded cookies from KV key '${input.cookiesKey}' into ${cookiePath}`);
      } else {
        log.warning(`cookiesKey '${input.cookiesKey}' not found or empty`);
      }
    } catch (e) {
      log.warning(`Failed to load cookies: ${(e as Error).message}`);
    }
  }

  // Prepare proxy
  let proxyUrl = input.proxy || "";
  if (!proxyUrl && input.useApifyProxy) {
    try {
      const proxyConfig = await Actor.createProxyConfiguration({ groups: input.proxyGroups });
      const newUrl = await proxyConfig?.newUrl();
      if (newUrl) {
        proxyUrl = newUrl;
        log.info(`Using Apify proxy${input.proxyGroups?.length ? ` groups=${input.proxyGroups.join(',')}` : ''}`);
      } else {
        log.warning("Apify proxy returned undefined URL");
      }
    } catch (e) {
      log.warning(`Could not initialize Apify proxy: ${(e as Error).message}`);
    }
  }

  // Process each list
  for (const listURL of input.listURLs) {
    try {
      log.info(`Scraping: ${listURL}`);

      const tweets = await scrapeList(listURL, {
        maxTweets: input.maxTweets || 200,
        timeoutMs: input.timeoutMs || 60000,
        headless: input.headless !== false,
        proxy: proxyUrl,
        persistCookiesPath: input.persistCookiesPath || "/data/cookies.json",
        partialOk: input.partialOk || false,
      });

      log.info(`✓ Scraped ${tweets.length} tweets from ${listURL}`);

      // Push each tweet to dataset with source URL
      for (const tweet of tweets) {
        await Dataset.pushData({
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

  log.info("✓ Actor finished");
  await Actor.exit();
}

// Run the actor
main().catch((error) => {
  console.error("❌ Actor failed:");
  console.error(error);
  process.exit(1);
});
