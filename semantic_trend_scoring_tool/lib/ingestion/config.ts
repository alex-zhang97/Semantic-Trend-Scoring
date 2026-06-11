import { INGEST_SOURCE_IDS, type IngestSourceId, type SourceConfigStatus } from "./types";

export type IngestionConfig = {
  defaultLimit: number;
  requestTimeoutMs: number;
  googleTrends: {
    geo: string;
    lang: string;
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
  tiktok: {
    tokenEndpoint: string;
    queryEndpoint: string;
    clientKey?: string;
    clientSecret?: string;
    fields: string[];
    keywords: string[];
    regionCodes: string[];
    lookbackDays: number;
  };
  twitter: {
    endpoint: string;
    bearerToken?: string;
    woeid: number;
    maxTrends: number;
    fields: string[];
  };
  wsj: {
    apiUrl?: string;
    apiKey?: string;
    rssUrls: string[];
    userAgent?: string;
  };
  nyt: {
    endpoint: string;
    apiKey?: string;
    section: string;
  };
  washingtonPost: {
    apiUrl?: string;
    apiKey?: string;
    rssUrls: string[];
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

const DEFAULT_TIKTOK_FIELDS = [
  "id",
  "video_description",
  "create_time",
  "region_code",
  "share_count",
  "view_count",
  "like_count",
  "comment_count",
  "hashtag_names",
  "username",
];

const DEFAULT_TIKTOK_KEYWORDS = [
  "news",
  "politics",
  "sports",
  "technology",
  "entertainment",
  "business",
  "health",
];

const DEFAULT_WASHINGTON_POST_RSS_URLS = [
  "https://feeds.washingtonpost.com/rss/politics",
  "https://feeds.washingtonpost.com/rss/national",
  "https://feeds.washingtonpost.com/rss/world",
  "https://feeds.washingtonpost.com/rss/business",
  "https://feeds.washingtonpost.com/rss/business/technology",
  "https://feeds.washingtonpost.com/rss/lifestyle",
  "https://feeds.washingtonpost.com/rss/entertainment",
];

export function getIngestionConfig(): IngestionConfig {
  return {
    defaultLimit: readPositiveInteger("INGEST_DEFAULT_LIMIT", 25),
    requestTimeoutMs: readPositiveInteger("INGEST_REQUEST_TIMEOUT_MS", 10_000),
    googleTrends: {
      geo: process.env.GOOGLE_TRENDS_GEO || "US",
      lang: process.env.GOOGLE_TRENDS_LANG || "en",
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
    tiktok: {
      tokenEndpoint:
        process.env.TIKTOK_TOKEN_ENDPOINT ||
        "https://open.tiktokapis.com/v2/oauth/token/",
      queryEndpoint:
        process.env.TIKTOK_RESEARCH_VIDEO_QUERY_ENDPOINT ||
        "https://open.tiktokapis.com/v2/research/video/query/",
      clientKey: emptyToUndefined(process.env.TIKTOK_CLIENT_KEY),
      clientSecret: emptyToUndefined(process.env.TIKTOK_CLIENT_SECRET),
      fields: readCsv("TIKTOK_RESEARCH_FIELDS", DEFAULT_TIKTOK_FIELDS),
      keywords: readCsv("TIKTOK_KEYWORDS", DEFAULT_TIKTOK_KEYWORDS),
      regionCodes: readCsv("TIKTOK_REGION_CODES", ["US"]),
      lookbackDays: readPositiveInteger("TIKTOK_LOOKBACK_DAYS", 7),
    },
    twitter: {
      endpoint:
        process.env.X_TRENDS_BY_WOEID_ENDPOINT ||
        "https://api.x.com/2/trends/by/woeid",
      bearerToken: emptyToUndefined(
        process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN,
      ),
      woeid: readPositiveInteger("X_TRENDS_WOEID", 23_424_977),
      maxTrends: readPositiveInteger("X_TRENDS_MAX_TRENDS", 20),
      fields: readCsv("X_TREND_FIELDS", ["trend_name", "tweet_count"]),
    },
    wsj: {
      apiUrl: emptyToUndefined(process.env.WSJ_API_URL),
      apiKey: emptyToUndefined(process.env.WSJ_API_KEY),
      rssUrls: readCsv("WSJ_RSS_URLS", []),
      userAgent: emptyToUndefined(process.env.WSJ_USER_AGENT),
    },
    nyt: {
      endpoint:
        process.env.NYT_TOP_STORIES_ENDPOINT ||
        "https://api.nytimes.com/svc/topstories/v2",
      apiKey: emptyToUndefined(process.env.NYT_API_KEY),
      section: process.env.NYT_TOP_STORIES_SECTION || "home",
    },
    washingtonPost: {
      apiUrl: emptyToUndefined(process.env.WASHINGTON_POST_API_URL),
      apiKey: emptyToUndefined(process.env.WASHINGTON_POST_API_KEY),
      rssUrls: readCsv(
        "WASHINGTON_POST_RSS_URLS",
        DEFAULT_WASHINGTON_POST_RSS_URLS,
      ),
      userAgent: emptyToUndefined(process.env.WASHINGTON_POST_USER_AGENT),
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
      ready: true,
      requiresApiKey: false,
      requiredEnv: [],
      optionalEnv: ["GOOGLE_TRENDS_GEO", "GOOGLE_TRENDS_LANG"],
      missingEnv: [],
      notes: "Uses @shaivpidadi/trends-js dailyTrends method.",
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
    tiktok: {
      id: "tiktok",
      label: "TikTok Research API",
      enabled: true,
      ready: Boolean(config.tiktok.clientKey && config.tiktok.clientSecret),
      requiresApiKey: true,
      requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      optionalEnv: [
        "TIKTOK_TOKEN_ENDPOINT",
        "TIKTOK_RESEARCH_VIDEO_QUERY_ENDPOINT",
        "TIKTOK_RESEARCH_FIELDS",
        "TIKTOK_KEYWORDS",
        "TIKTOK_REGION_CODES",
        "TIKTOK_LOOKBACK_DAYS",
      ],
      missingEnv: missingEnv({
        TIKTOK_CLIENT_KEY: config.tiktok.clientKey,
        TIKTOK_CLIENT_SECRET: config.tiktok.clientSecret,
      }),
      notes:
        "Requires TikTok Research API approval and the research.data.basic scope.",
    },
    twitter: {
      id: "twitter",
      label: "X Trends by WOEID",
      enabled: true,
      ready: Boolean(config.twitter.bearerToken),
      requiresApiKey: true,
      requiredEnv: ["X_BEARER_TOKEN"],
      optionalEnv: [
        "X_TRENDS_BY_WOEID_ENDPOINT",
        "X_TRENDS_WOEID",
        "X_TRENDS_MAX_TRENDS",
        "X_TREND_FIELDS",
        "TWITTER_BEARER_TOKEN",
      ],
      missingEnv: missingEnv({
        X_BEARER_TOKEN: config.twitter.bearerToken,
      }),
      notes:
        "Uses X API v2 Trends by WOEID. Defaults to United States WOEID 23424977.",
    },
    wsj: {
      id: "wsj",
      label: "Wall Street Journal",
      enabled: true,
      ready: Boolean(
        (config.wsj.apiUrl && config.wsj.apiKey) || config.wsj.rssUrls.length,
      ),
      requiresApiKey: config.wsj.rssUrls.length === 0,
      requiredEnv: ["WSJ_API_URL", "WSJ_API_KEY"],
      optionalEnv: ["WSJ_API_URL", "WSJ_API_KEY", "WSJ_RSS_URLS", "WSJ_USER_AGENT"],
      missingEnv:
        config.wsj.apiUrl && config.wsj.apiKey
          ? []
          : missingEnv({
              WSJ_API_URL: config.wsj.apiUrl,
              WSJ_API_KEY: config.wsj.apiKey,
            }),
      notes:
        "Uses configured Dow Jones/WSJ API credentials, or explicit WSJ_RSS_URLS if you choose feed ingestion.",
    },
    nyt: {
      id: "nyt",
      label: "New York Times",
      enabled: true,
      ready: Boolean(config.nyt.apiKey),
      requiresApiKey: true,
      requiredEnv: ["NYT_API_KEY"],
      optionalEnv: ["NYT_TOP_STORIES_ENDPOINT", "NYT_TOP_STORIES_SECTION"],
      missingEnv: missingEnv({
        NYT_API_KEY: config.nyt.apiKey,
      }),
      notes: "Uses the NYT Top Stories API.",
    },
    "washington-post": {
      id: "washington-post",
      label: "Washington Post",
      enabled: true,
      ready: Boolean(
        (config.washingtonPost.apiUrl && config.washingtonPost.apiKey) ||
          config.washingtonPost.rssUrls.length,
      ),
      requiresApiKey: false,
      requiredEnv: [],
      optionalEnv: [
        "WASHINGTON_POST_API_URL",
        "WASHINGTON_POST_API_KEY",
        "WASHINGTON_POST_RSS_URLS",
        "WASHINGTON_POST_USER_AGENT",
      ],
      missingEnv: [],
      notes:
        "Uses a configured Washington Post API when provided, otherwise official RSS feeds.",
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
