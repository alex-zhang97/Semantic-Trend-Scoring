import type { IngestionConfig } from "./config";
import { buildUrl, fetchJson, fetchText } from "./http";
import type { IngestSourceId, RawSignalRecord } from "./types";

export type SourceFetcher = (
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
) => Promise<RawSignalRecord[]>;

export const SOURCE_FETCHERS: Record<IngestSourceId, SourceFetcher> = {
  "google-trends": fetchGoogleTrendsSignals,
  reddit: fetchRedditSignals,
  gdelt: fetchGdeltSignals,
  news: fetchNewsSignals,
  wikipedia: fetchWikipediaSignals,
};

async function fetchGoogleTrendsSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (config.googleTrends.apiUrl && config.googleTrends.apiKey) {
    const url = buildUrl(config.googleTrends.apiUrl, {
      api_key: config.googleTrends.apiKey,
      geo: "US",
      limit: options.limit,
    });
    const payload = await fetchJson<unknown>(
      url,
      { headers: { Accept: "application/json" } },
      config.requestTimeoutMs,
    );

    return normalizeGoogleTrendsJson(payload, options.ingestedAt).slice(
      0,
      options.limit,
    );
  }

  const xml = await fetchText(
    config.googleTrends.rssUrl,
    { headers: { Accept: "application/rss+xml, application/xml, text/xml" } },
    config.requestTimeoutMs,
  );

  return parseGoogleTrendsRss(xml, options.ingestedAt).slice(0, options.limit);
}

async function fetchRedditSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (
    !config.reddit.clientId ||
    !config.reddit.clientSecret ||
    !config.reddit.userAgent
  ) {
    throw new Error("Missing Reddit OAuth environment variables.");
  }

  const accessToken = await getRedditAccessToken(config);
  const subredditPath = config.reddit.subreddits.join("+") || "all";
  const url = buildUrl(
    `https://oauth.reddit.com/r/${subredditPath}/hot`,
    {
      limit: options.limit,
      raw_json: 1,
    },
  );
  const payload = await fetchJson<RedditListing>(
    url,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": config.reddit.userAgent,
      },
    },
    config.requestTimeoutMs,
  );

  const posts = payload.data?.children ?? [];

  return posts
    .map((child) => child.data)
    .filter(isRedditPost)
    .map((post) => ({
      source: "reddit",
      timestamp: unixSecondsToIso(post.created_utc),
      ingestedAt: options.ingestedAt,
      title: post.title,
      content: post.selftext || undefined,
      engagement: post.score + post.num_comments,
      url: post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : post.url,
      metadata: {
        subreddit: post.subreddit,
        score: post.score,
        comments: post.num_comments,
        upvoteRatio: post.upvote_ratio,
        author: post.author,
        over18: post.over_18,
      },
      raw: post,
    }));
}

async function fetchGdeltSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  const url = buildUrl(config.gdelt.endpoint, {
    query: config.gdelt.query,
    mode: "ArtList",
    format: "json",
    sort: "HybridRel",
    timespan: config.gdelt.timespan,
    maxrecords: options.limit,
  });
  const payload = await fetchJson<GdeltDocResponse>(
    url,
    { headers: { Accept: "application/json" } },
    config.requestTimeoutMs,
  );

  return (payload.articles ?? []).map((article) => ({
    source: "gdelt",
    timestamp: parseGdeltDate(article.seendate) ?? options.ingestedAt,
    ingestedAt: options.ingestedAt,
    title: article.title,
    content: article.description,
    url: article.url,
    metadata: {
      domain: article.domain ?? null,
      sourceCountry: article.sourcecountry ?? null,
      language: article.language ?? null,
    },
    raw: article,
  }));
}

async function fetchNewsSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (!config.news.apiKey) {
    throw new Error("Missing NEWS_API_KEY.");
  }

  const url = buildUrl(config.news.endpoint, {
    country: config.news.country,
    pageSize: options.limit,
    apiKey: config.news.apiKey,
  });
  const payload = await fetchJson<NewsApiResponse>(
    url,
    { headers: { Accept: "application/json" } },
    config.requestTimeoutMs,
  );

  if (payload.status && payload.status !== "ok") {
    throw new Error(payload.message || `News API returned ${payload.status}.`);
  }

  return (payload.articles ?? [])
    .filter((article) => Boolean(article.title))
    .map((article) => ({
      source: "news",
      timestamp: normalizeDate(article.publishedAt) ?? options.ingestedAt,
      ingestedAt: options.ingestedAt,
      title: article.title,
      content: [article.description, article.content]
        .filter(Boolean)
        .join("\n\n") || undefined,
      url: article.url,
      metadata: {
        provider: article.source?.name ?? null,
        author: article.author ?? null,
      },
      raw: article,
    }));
}

async function fetchWikipediaSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (!config.wikipedia.userAgent) {
    throw new Error("Missing WIKIMEDIA_USER_AGENT.");
  }

  const snapshotDate = getPreviousUtcDateParts();
  const url = [
    config.wikipedia.endpoint,
    snapshotDate.year,
    snapshotDate.month,
    snapshotDate.day,
  ].join("/");
  const payload = await fetchJson<WikipediaTopResponse>(
    url,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": config.wikipedia.userAgent,
      },
    },
    config.requestTimeoutMs,
  );
  const articles = payload.items?.[0]?.articles ?? [];

  return articles
    .filter((article) => isUsefulWikipediaArticle(article.article))
    .slice(0, options.limit)
    .map((article) => ({
      source: "wikipedia",
      timestamp: `${snapshotDate.year}-${snapshotDate.month}-${snapshotDate.day}T00:00:00.000Z`,
      ingestedAt: options.ingestedAt,
      title: article.article.replaceAll("_", " "),
      engagement: article.views,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.article)}`,
      metadata: {
        rank: article.rank,
        views: article.views,
      },
      raw: article,
    }));
}

async function getRedditAccessToken(
  config: IngestionConfig,
): Promise<string> {
  const credentials = Buffer.from(
    `${config.reddit.clientId}:${config.reddit.clientSecret}`,
  ).toString("base64");
  const payload = await fetchJson<RedditTokenResponse>(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": config.reddit.userAgent || "semantic-trend-scoring",
      },
      body: "grant_type=client_credentials",
    },
    config.requestTimeoutMs,
  );

  if (!payload.access_token) {
    throw new Error("Reddit did not return an access token.");
  }

  return payload.access_token;
}

function normalizeGoogleTrendsJson(
  payload: unknown,
  ingestedAt: string,
): RawSignalRecord[] {
  const items = findFirstArray(payload, [
    "trends",
    "items",
    "results",
    "dailyTrends",
    "trendingSearches",
  ]);

  return items
    .map((item) => normalizeRecordObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const title =
        readString(item, "title") ||
        readString(item, "query") ||
        readString(item, "name") ||
        readString(item, "keyword") ||
        "Untitled Google Trends item";

      return {
        source: "google-trends",
        timestamp:
          normalizeDate(readString(item, "publishedAt")) ??
          normalizeDate(readString(item, "date")) ??
          ingestedAt,
        ingestedAt,
        title,
        content:
          readString(item, "description") ||
          readString(item, "summary") ||
          undefined,
        engagement:
          readNumber(item, "traffic") ??
          readNumber(item, "searchVolume") ??
          undefined,
        url: readString(item, "url") || readString(item, "link") || undefined,
        raw: item,
      };
    });
}

function parseGoogleTrendsRss(
  xml: string,
  ingestedAt: string,
): RawSignalRecord[] {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return itemMatches.map((itemXml) => {
    const title = readXmlTag(itemXml, "title") || "Untitled Google trend";
    const publishedAt = readXmlTag(itemXml, "pubDate");
    const traffic = readXmlTag(itemXml, "ht:approx_traffic");

    return {
      source: "google-trends",
      timestamp: normalizeDate(publishedAt) ?? ingestedAt,
      ingestedAt,
      title,
      content: readXmlTag(itemXml, "description") || undefined,
      engagement: parseApproximateCount(traffic),
      url: readXmlTag(itemXml, "link") || undefined,
      metadata: {
        approximateTraffic: traffic || null,
        picture: readXmlTag(itemXml, "ht:picture") || null,
        pictureSource: readXmlTag(itemXml, "ht:picture_source") || null,
      },
      raw: itemXml,
    };
  });
}

function findFirstArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  const trendingSearchDays = payload.trendingSearchesDays;

  if (Array.isArray(trendingSearchDays)) {
    return trendingSearchDays.flatMap((day) => {
      if (!isRecord(day) || !Array.isArray(day.trendingSearches)) {
        return [];
      }

      return day.trendingSearches;
    });
  }

  return [];
}

function normalizeRecordObject(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = value.title;

  if (isRecord(title) && typeof title.query === "string") {
    return { ...value, title: title.query };
  }

  return value;
}

function readXmlTag(xml: string, tagName: string): string {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, "i"),
  );

  return decodeXml(match?.[1]?.trim() ?? "");
}

function decodeXml(value: string): string {
  const withoutCdata = value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");

  return withoutCdata
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function parseApproximateCount(value: string): number | undefined {
  const normalized = value.trim().toUpperCase().replaceAll(",", "");

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)([KMB])?\+?$/);

  if (!match) {
    return undefined;
  }

  const amount = Number.parseFloat(match[1]);
  const multiplier = match[2] === "B" ? 1_000_000_000 : match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

function parseGdeltDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d{14}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}.000Z`;
  }

  return normalizeDate(value);
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function unixSecondsToIso(value: number): string {
  return new Date(value * 1000).toISOString();
}

function getPreviousUtcDateParts(): {
  year: string;
  month: string;
  day: string;
} {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

function isUsefulWikipediaArticle(title: string): boolean {
  const excludedPrefixes = [
    "Main_Page",
    "Special:",
    "Wikipedia:",
    "File:",
    "Help:",
    "Template:",
    "Category:",
    "Portal:",
  ];

  return !excludedPrefixes.some((prefix) => title.startsWith(prefix));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const field = value[key];

  return typeof field === "string" && field.length > 0 ? field : undefined;
}

function readNumber(
  value: Record<string, unknown>,
  key: string,
): number | undefined {
  const field = value[key];

  return typeof field === "number" && Number.isFinite(field) ? field : undefined;
}

type RedditTokenResponse = {
  access_token?: string;
};

type RedditListing = {
  data?: {
    children?: Array<{
      data?: unknown;
    }>;
  };
};

type RedditPost = {
  title: string;
  created_utc: number;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  author: string;
  over_18: boolean;
  permalink?: string;
  url?: string;
  selftext?: string;
};

function isRedditPost(value: unknown): value is RedditPost {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.created_utc === "number" &&
    typeof value.subreddit === "string" &&
    typeof value.score === "number" &&
    typeof value.num_comments === "number" &&
    typeof value.upvote_ratio === "number" &&
    typeof value.author === "string" &&
    typeof value.over_18 === "boolean"
  );
}

type GdeltDocResponse = {
  articles?: Array<{
    title: string;
    url?: string;
    seendate?: string;
    description?: string;
    domain?: string;
    sourcecountry?: string;
    language?: string;
  }>;
};

type NewsApiResponse = {
  status?: string;
  message?: string;
  articles?: Array<{
    source?: {
      name?: string;
    };
    author?: string | null;
    title: string;
    description?: string | null;
    url?: string;
    publishedAt?: string;
    content?: string | null;
  }>;
};

type WikipediaTopResponse = {
  items?: Array<{
    articles?: Array<{
      article: string;
      views: number;
      rank: number;
    }>;
  }>;
};
