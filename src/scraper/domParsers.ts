import type { ElementHandle, Page } from "playwright";
import type { Tweet } from "../types.js";
import { parseCount } from "../lib/counts.js";
import { formatTwitterTimestamp, parseRelativeTime } from "../lib/time.js";
import { extractTweetId } from "../lib/url.js";

/**
 * Extract tweet data from an article element
 */
export async function parseTweetElement(
  article: ElementHandle<HTMLElement | SVGElement>
): Promise<Tweet | null> {
  try {
    // Extract tweet ID from link
    const tweetLink = await article.$('a[href*="/status/"]');
    const href = await tweetLink?.getAttribute("href");
    const id = href ? extractTweetId(href) : null;

    if (!id) {
      return null;
    }

    // Extract text - look for the tweet text div
    const textElement = await article.$(
      '[data-testid="tweetText"], [lang], div[dir="auto"]'
    );
    const text = (await textElement?.textContent())?.trim() || "";

    // Detect retweets and quotes
    const retweetIndicator = await article.$('[data-testid="socialContext"]');
    const retweetText = await retweetIndicator?.textContent();
    const isRetweet = retweetText?.includes("reposted") || false;

    // Check for quote tweet
    const quoteTweet = await article.$('[role="link"][href*="/status/"]');
    const isQuote = (await quoteTweet?.getAttribute("href")) !== href;

    // Extract engagement metrics
    const replyButton = await article.$('[data-testid="reply"]');
    const replyCount = await extractCountFromButton(replyButton);

    const retweetButton = await article.$('[data-testid="retweet"]');
    const retweetCount = await extractCountFromButton(retweetButton);

    const likeButton = await article.$('[data-testid="like"]');
    const likeCount = await extractCountFromButton(likeButton);

    // Quote count is harder to get - sometimes in analytics
    const quoteCount = 0; // May need more sophisticated extraction

    // Bookmark count is typically not visible without clicking
    const bookmarkCount = 0;

    // Extract timestamp
    const timeElement = await article.$("time");
    const datetime = await timeElement?.getAttribute("datetime");
    let createdAt: string;

    if (datetime) {
      createdAt = formatTwitterTimestamp(new Date(datetime));
    } else {
      // Try to parse relative time from text
      const timeText = (await timeElement?.textContent())?.trim() || "";
      const date = parseRelativeTime(timeText);
      createdAt = formatTwitterTimestamp(date);
    }

    return {
      id,
      text,
      retweetCount,
      replyCount,
      likeCount,
      quoteCount,
      createdAt,
      bookmarkCount,
      isRetweet,
      isQuote,
    };
  } catch (error) {
    console.error("Error parsing tweet element:", error);
    return null;
  }
}

/**
 * Extract count from engagement button
 */
async function extractCountFromButton(
  button: ElementHandle | null
): Promise<number> {
  if (!button) {
    return 0;
  }

  try {
    const countElement = await button.$(
      '[data-testid$="count"], span:not([data-testid])'
    );
    const text = (await countElement?.textContent())?.trim() || "0";
    return parseCount(text);
  } catch {
    return 0;
  }
}

/**
 * Wait for tweets to load on the page
 */
export async function waitForTweets(
  page: Page,
  timeoutMs: number = 30000
): Promise<boolean> {
  try {
    await page.waitForSelector('article[data-testid="tweet"], article:has([data-testid="tweetText"])', {
      timeout: timeoutMs,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll to load more tweets
 */
export async function scrollToLoadMore(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Wait a bit for new content to load
  await page.waitForTimeout(1500);
}

/**
 * Check if we've reached the end of the feed
 */
export async function isEndOfFeed(page: Page): Promise<boolean> {
  // Look for "You're all caught up" or similar indicators
  const endIndicators = [
    'text="You\'re all caught up"',
    'text="Nothing to see here"',
    'text="That\'s all for now"',
  ];

  for (const selector of endIndicators) {
    const element = await page.$(selector);
    if (element) {
      return true;
    }
  }

  return false;
}

/**
 * Get all tweet articles currently on the page
 */
export async function getTweetArticles(
  page: Page
): Promise<ElementHandle<HTMLElement | SVGElement>[]> {
  // Playwright may return SVGElement handles (e.g., icons). Allow union type.
  return await page.$$('article[data-testid="tweet"], article:has([data-testid="tweetText"])');
}

/**
 * Check for login wall or rate limit
 */
export async function checkForBlockers(
  page: Page
): Promise<{ blocked: boolean; reason?: string }> {
  // Check for login prompt using multiple selectors (page.$ accepts one selector per call)
  const loginSelectors = [
    'text="Sign in to X"',
    'text="Log in to X"',
    'text="Sign in"',
    'text="Log in"',
    'aria/Sign in',
    '[data-testid="login"]',
  ];
  for (const sel of loginSelectors) {
    const loginPrompt = await page.$(sel);
    if (loginPrompt) {
      return { blocked: true, reason: "LOGIN_REQUIRED" };
    }
  }

  // Check for rate limit indicators
  const rateLimitSelectors = [
    'text="Rate limit exceeded"',
    'text="Too many requests"',
    'text=/rate limit/i',
    'text=/too many/i',
  ];
  for (const sel of rateLimitSelectors) {
    const rateLimitText = await page.$(sel);
    if (rateLimitText) {
      return { blocked: true, reason: "RATE_LIMIT" };
    }
  }

  return { blocked: false };
}
