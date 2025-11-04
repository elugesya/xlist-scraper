/**
 * Validate and normalize Twitter/X list URLs
 */
export function isValidListUrl(url: string): boolean {
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
}

/**
 * Extract list ID from URL
 */
export function extractListId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/i\/lists\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Normalize URL to x.com format
 */
export function normalizeListUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "twitter.com" ||
      parsed.hostname === "www.twitter.com"
    ) {
      parsed.hostname = "x.com";
    } else if (parsed.hostname === "www.x.com") {
      parsed.hostname = "x.com";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract tweet ID from a tweet URL or element
 */
export function extractTweetId(urlOrPath: string): string | null {
  try {
    // Handle full URLs
    if (urlOrPath.startsWith("http")) {
      const parsed = new URL(urlOrPath);
      const match = parsed.pathname.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }

    // Handle paths
    const match = urlOrPath.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
