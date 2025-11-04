#!/usr/bin/env node

import { scrapeList } from "./scraper/scrapeList.js";
import type { ScrapeOptions } from "./types.js";

/**
 * Parse command line arguments
 */
function parseArgs(): {
  url: string;
  options: ScrapeOptions;
  help: boolean;
} {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { url: "", options: {}, help: true };
  }

  const url = args[0];
  const options: ScrapeOptions = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--max-tweets") {
      options.maxTweets = parseInt(args[++i], 10);
    } else if (arg === "--timeout") {
      options.timeoutMs = parseInt(args[++i], 10);
    } else if (arg === "--headless") {
      options.headless = args[++i] !== "false";
    } else if (arg === "--cookies") {
      options.persistCookiesPath = args[++i];
    } else if (arg === "--proxy") {
      options.proxy = args[++i];
    } else if (arg === "--partial-ok") {
      options.partialOk = true;
    }
  }

  return { url, options, help: false };
}

/**
 * Display help message
 */
function displayHelp() {
  console.error(`
xlist-scrape - Twitter (X) List Scraper

USAGE:
  xlist-scrape <list-url> [options]

OPTIONS:
  --max-tweets <number>    Maximum number of tweets to scrape (default: 200)
  --timeout <ms>           Timeout in milliseconds (default: 60000)
  --headless <boolean>     Run in headless mode (default: true)
  --cookies <path>         Path to cookies file for authentication
  --proxy <url>            Proxy URL (e.g., http://user:pass@host:port)
  --partial-ok             Return partial results on error
  -h, --help               Display this help message

EXAMPLES:
  # Basic usage
  xlist-scrape "https://x.com/i/lists/1985510758294208956"

  # Scrape 500 tweets
  xlist-scrape "https://x.com/i/lists/1985510758294208956" --max-tweets 500

  # Use cookies for authentication
  xlist-scrape "https://x.com/i/lists/1985510758294208956" --cookies ./cookies.json

  # Save output to file
  xlist-scrape "https://x.com/i/lists/1985510758294208956" > tweets.json

OUTPUT:
  Tweets are output as JSON array to STDOUT
  Logs and errors are written to STDERR
`);
}

/**
 * Main CLI function
 */
async function main() {
  const { url, options, help } = parseArgs();

  if (help) {
    displayHelp();
    process.exit(0);
  }

  if (!url) {
    console.error("Error: List URL is required");
    displayHelp();
    process.exit(1);
  }

  try {
    console.error(`Scraping list: ${url}`);
    console.error(`Options:`, JSON.stringify(options, null, 2));

    const tweets = await scrapeList(url, options);

    console.error(`\nSuccessfully scraped ${tweets.length} tweets`);

    // Output JSON to stdout
    console.log(JSON.stringify(tweets, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
