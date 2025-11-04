/**
 * Normalize count strings like "1.2K", "3M", "456" to numbers
 */
export function parseCount(countStr: string | null | undefined): number {
  if (!countStr || countStr.trim() === "" || countStr === "-") {
    return 0;
  }

  const cleaned = countStr.trim().toUpperCase();

  // Handle comma-separated numbers like "1,234"
  const withoutCommas = cleaned.replace(/,/g, "");

  // Match number with optional K/M/B suffix
  const match = withoutCommas.match(/^([\d.]+)([KMB])?$/);

  if (!match) {
    return 0;
  }

  const [, numStr, suffix] = match;
  const num = parseFloat(numStr);

  if (isNaN(num)) {
    return 0;
  }

  switch (suffix) {
    case "K":
      return Math.floor(num * 1000);
    case "M":
      return Math.floor(num * 1000000);
    case "B":
      return Math.floor(num * 1000000000);
    default:
      return Math.floor(num);
  }
}

/**
 * Extract count from element text content
 */
export function extractCount(element: any): number {
  try {
    const text = element?.textContent?.trim() || "";
    return parseCount(text);
  } catch {
    return 0;
  }
}
