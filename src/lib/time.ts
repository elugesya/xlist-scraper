/**
 * Format date to Twitter's timestamp format: "EEE MMM dd HH:mm:ss +0000 yyyy"
 * Example: "Tue Nov 04 19:06:32 +0000 2025"
 */
export function formatTwitterTimestamp(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const dateNum = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day} ${month} ${dateNum} ${hours}:${minutes}:${seconds} +0000 ${year}`;
}

/**
 * Parse various date formats that might appear in tweets
 */
export function parseTwitterDate(dateStr: string): Date {
  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try Twitter's native format
  const twitterFormat =
    /^(\w{3}) (\w{3}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) \+0000 (\d{4})$/;
  const match = dateStr.match(twitterFormat);

  if (match) {
    const [, , month, day, hours, minutes, seconds, year] = match;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = months.indexOf(month);

    return new Date(
      Date.UTC(
        parseInt(year),
        monthIndex,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      )
    );
  }

  // Fallback to current time if parsing fails
  return new Date();
}

/**
 * Parse relative time strings like "2h", "3m", "5d"
 */
export function parseRelativeTime(relativeStr: string): Date {
  const now = Date.now();

  const match = relativeStr.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(now);
  }

  const [, numStr, unit] = match;
  const num = parseInt(numStr);

  let milliseconds = 0;
  switch (unit) {
    case "s":
      milliseconds = num * 1000;
      break;
    case "m":
      milliseconds = num * 60 * 1000;
      break;
    case "h":
      milliseconds = num * 60 * 60 * 1000;
      break;
    case "d":
      milliseconds = num * 24 * 60 * 60 * 1000;
      break;
  }

  return new Date(now - milliseconds);
}
