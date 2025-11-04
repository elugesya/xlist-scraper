export type Tweet = {
  id: string;
  text: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  createdAt: string; // e.g., "Tue Nov 04 19:06:32 +0000 2025"
  bookmarkCount: number; // 0 if unavailable
  isRetweet: boolean;
  isQuote: boolean;
};

export type ApiTweet = Tweet & {
  sourceListURL: string;
};

export type ScrapeOptions = {
  maxTweets?: number;
  timeoutMs?: number;
  headless?: boolean;
  persistCookiesPath?: string;
  proxy?: string;
  partialOk?: boolean;
};

export type ScrapeListRequest = {
  listURL: string[];
  "max-tweets"?: number;
  "timeout-ms"?: number;
  maxTweets?: number;
  timeoutMs?: number;
  listUrl?: string[];
};

export type ScrapeListResponse = {
  ok: true;
  count: number;
  items: ApiTweet[];
};

export type ErrorResponse = {
  ok: false;
  error: string;
  message?: string;
  details?: any[];
  items?: ApiTweet[];
};

export type HealthResponse = {
  status: "ok";
};
