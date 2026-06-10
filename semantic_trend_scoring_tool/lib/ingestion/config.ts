import { INGEST_SOURCE_IDS, type IngestSourceId, type SourceConfigStatus } from "./types";

export type IngestionConfig = {
  defaultLimit: number;
  requestTimeoutMs: number;
  googleTrends: {
    rssUrl: string;
    apiUrl?: string;
    apiKey?: string;
  };
  reddit: {
    clientId?: string;
    clientSecret?: string;
    userAgent?: string;
    subreddits: string[];
  };
  gdelt: {
    endpoint: string;
    query: string;
    timespan: string;
  };
  news: {
    endpoint: string;
    apiKey?: string;
    country: string;
  };
  wikipedia: {
    endpoint: string;
    userAgent?: string;
  };
};

const DEFAULT_SUBREDDITS = [
  "news",
  "politics",
  "sports",
  "technology",
  "entertainment",
  "business",
  "health",
];

export function getIngestionConfig(): IngestionConfig {
  return {
    defaultLimit: readPositiveInteger("INGEST_DEFAULT_LIMIT", 25),
    requestTimeoutMs: readPositiveInteger("INGEST_REQUEST_TIMEOUT_MS", 10_000),
    googleTrends: {
      rssUrl:
        process.env.GOOGLE_TRENDS_RSS_URL ||
        "https://trends.google.com/trending/rss?geo=US",
      apiUrl: emptyToUndefined(process.env.GOOGLE_TRENDS_API_URL),
      apiKey: emptyToUndefined(process.env.GOOGLE_TRENDS_API_KEY),
    },
    reddit: {
      clientId: emptyToUndefined(process.env.REDDIT_CLIENT_ID),
      clientSecret: emptyToUndefined(process.env.REDDIT_CLIENT_SECRET),
      userAgent: emptyToUndefined(process.env.REDDIT_USER_AGENT),
      subreddits: readCsv("REDDIT_SUBREDDITS", DEFAULT_SUBREDDITS),
    },
    gdelt: {
      endpoint:
        process.env.GDELT_API_ENDPOINT ||
        "https://api.gdeltproject.org/api/v2/doc/doc",
      query: process.env.GDELT_QUERY || "sourcecountry:US",
      timespan: process.env.GDELT_TIMESPAN || "24h",
    },
    news: {
      endpoint:
        process.env.NEWS_API_ENDPOINT ||
        "https://newsapi.org/v2/top-headlines",
      apiKey: emptyToUndefined(process.env.NEWS_API_KEY),
      country: process.env.NEWS_API_COUNTRY || "us",
    },
    wikipedia: {
      endpoint:
        process.env.WIKIPEDIA_PAGEVIEWS_ENDPOINT ||
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access",
      userAgent: emptyToUndefined(process.env.WIKIMEDIA_USER_AGENT),
    },
  };
}

export function getSourceConfigStatuses(
  config = getIngestionConfig(),
): SourceConfigStatus[] {
  const statuses: Record<IngestSourceId, SourceConfigStatus> = {
    "google-trends": {
      id: "google-trends",
      label: "Google Trends",
      enabled: true,
      ready: Boolean(config.googleTrends.rssUrl || config.googleTrends.apiUrl),
      requiresApiKey: false,
      requiredEnv: [],
      optionalEnv: [
        "GOOGLE_TRENDS_RSS_URL",
        "GOOGLE_TRENDS_API_URL",
        "GOOGLE_TRENDS_API_KEY",
      ],
      missingEnv: [],
      notes:
        config.googleTrends.apiUrl && !config.googleTrends.apiKey
          ? "Custom Google Trends API URL configured without GOOGLE_TRENDS_API_KEY; RSS fallback will be used."
          : "Uses the public US daily trends RSS feed unless a custom API URL is configured.",
    },
    reddit: {
      id: "reddit",
      label: "Reddit",
      enabled: true,
      ready: Boolean(
        config.reddit.clientId &&
          config.reddit.clientSecret &&
          config.reddit.userAgent,
      ),
      requiresApiKey: true,
      requiredEnv: [
        "REDDIT_CLIENT_ID",
        "REDDIT_CLIENT_SECRET",
        "REDDIT_USER_AGENT",
      ],
      optionalEnv: ["REDDIT_SUBREDDITS"],
      missingEnv: missingEnv({
        REDDIT_CLIENT_ID: config.reddit.clientId,
        REDDIT_CLIENT_SECRET: config.reddit.clientSecret,
        REDDIT_USER_AGENT: config.reddit.userAgent,
      }),
    },
    gdelt: {
      id: "gdelt",
      label: "GDELT",
      enabled: true,
      ready: Boolean(config.gdelt.endpoint && config.gdelt.query),
      requiresApiKey: false,
      requiredEnv: [],
      optionalEnv: ["GDELT_API_ENDPOINT", "GDELT_QUERY", "GDELT_TIMESPAN"],
      missingEnv: [],
    },
    news: {
      id: "news",
      label: "News API",
      enabled: true,
      ready: Boolean(config.news.apiKey),
      requiresApiKey: true,
      requiredEnv: ["NEWS_API_KEY"],
      optionalEnv: ["NEWS_API_ENDPOINT", "NEWS_API_COUNTRY"],
      missingEnv: missingEnv({
        NEWS_API_KEY: config.news.apiKey,
      }),
    },
    wikipedia: {
      id: "wikipedia",
      label: "Wikipedia Pageviews",
      enabled: true,
      ready: Boolean(config.wikipedia.userAgent),
      requiresApiKey: false,
      requiredEnv: ["WIKIMEDIA_USER_AGENT"],
      optionalEnv: ["WIKIPEDIA_PAGEVIEWS_ENDPOINT"],
      missingEnv: missingEnv({
        WIKIMEDIA_USER_AGENT: config.wikipedia.userAgent,
      }),
      notes:
        "Wikimedia asks callers to identify the app with a useful User-Agent.",
    },
  };

  return INGEST_SOURCE_IDS.map((id) => statuses[id]);
}

export function isIngestSourceId(value: string): value is IngestSourceId {
  return INGEST_SOURCE_IDS.includes(value as IngestSourceId);
}

function readPositiveInteger(envName: string, fallback: number): number {
  const rawValue = process.env[envName];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readCsv(envName: string, fallback: string[]): string[] {
  const rawValue = process.env[envName];

  if (!rawValue) {
    return fallback;
  }

  const values = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : fallback;
}

function missingEnv(envValues: Record<string, string | undefined>): string[] {
  return Object.entries(envValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
