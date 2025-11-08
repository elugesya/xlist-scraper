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
  cookiesJson?: unknown; // array of cookie objects or storageState-like { cookies: [...] }
  cookiesUrl?: string;   // remote URL returning cookies JSON
  partialOk?: boolean;
}

// SDK handles input and dataset IO reliably on Apify

/**
 * Main Actor handler
 */
type SimpleCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

function normalizeCookies(data: unknown): SimpleCookie[] | null {
  try {
    let value = data;
    if (typeof value === "string") {
      value = JSON.parse(value);
    }
    // If storageState-like { cookies: [...] }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.cookies)) {
        return coerceCookieArray(obj.cookies as unknown[]);
      }
    }
    // If it's already an array of cookies
    if (Array.isArray(value)) {
      return coerceCookieArray(value as unknown[]);
    }
  } catch {
    // ignore
  }
  return null;
}

function coerceCookieArray(arr: unknown[]): SimpleCookie[] | null {
  const out: SimpleCookie[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    const name = typeof obj.name === "string" ? obj.name : undefined;
    const value = typeof obj.value === "string" ? obj.value : undefined;
    if (!name || !value) continue;

    const cookie: SimpleCookie = { name, value };
    if (typeof obj.domain === "string") cookie.domain = obj.domain;
    if (typeof obj.path === "string") cookie.path = obj.path;
    const exp = typeof obj.expires === "number" ? obj.expires : typeof obj.expiry === "number" ? obj.expiry : undefined;
    if (typeof exp === "number") cookie.expires = exp;
    if (typeof obj.httpOnly === "boolean") cookie.httpOnly = obj.httpOnly;
    if (typeof obj.secure === "boolean") cookie.secure = obj.secure;
    const ss = obj.sameSite;
    if (ss === "Strict" || ss === "Lax" || ss === "None") cookie.sameSite = ss;

    // Some exports omit path; default to '/'
    if (!cookie.path) cookie.path = "/";

    out.push(cookie);
  }
  return out.length ? out : null;
}

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

  // If cookies are provided via any source, save to file for scraper to consume
    // Load cookies from any supported source
    const cookiePath = input.persistCookiesPath || "/data/cookies.json";
    let cookiesWritten = false;
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      const writeCookies = async (cookies: SimpleCookie[]) => {
        await fs.mkdir(path.dirname(cookiePath), { recursive: true });
        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        cookiesWritten = true;
      };

      // Priority 1: inline JSON
      const inlineCookies = normalizeCookies(input.cookiesJson);
      if (inlineCookies) {
        await writeCookies(inlineCookies);
        log.info(`Loaded cookies from input.cookiesJson into ${cookiePath}`);
      }

      // Priority 2: KV store key
      if (!cookiesWritten && input.cookiesKey) {
        const kvValue = await Actor.getValue(input.cookiesKey);
        const kvCookies = normalizeCookies(kvValue);
        if (kvCookies) {
          await writeCookies(kvCookies);
          log.info(`Loaded cookies from KV key '${input.cookiesKey}' into ${cookiePath}`);
        } else if (kvValue) {
          log.warning(`cookiesKey '${input.cookiesKey}' exists but format is not recognized`);
        } else {
          log.warning(`cookiesKey '${input.cookiesKey}' not found or empty`);
        }
      }

      // Priority 3: remote URL
      if (!cookiesWritten && input.cookiesUrl) {
        try {
          const fetchFn = (globalThis as unknown as {
            fetch: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
          }).fetch;
          const res = await fetchFn(input.cookiesUrl);
          if (res.ok) {
            const remoteData = await res.json();
            const remoteCookies = normalizeCookies(remoteData);
            if (remoteCookies) {
              await writeCookies(remoteCookies);
              log.info(`Loaded cookies from cookiesUrl into ${cookiePath}`);
            } else {
              log.warning(`cookiesUrl returned unrecognized format`);
            }
          } else {
            log.warning(`cookiesUrl request failed with status ${res.status}`);
          }
        } catch (e) {
          log.warning(`Failed to fetch cookiesUrl: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log.warning(`Cookie handling failed: ${(e as Error).message}`);
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
