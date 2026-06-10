import GoogleTrendsApi from "@shaivpidadi/trends-js";
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
  tiktok: fetchTikTokSignals,
  twitter: fetchTwitterSignals,
  wsj: fetchWsjSignals,
  nyt: fetchNytSignals,
  "washington-post": fetchWashingtonPostSignals,
};

async function fetchGoogleTrendsSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  const payload = (await GoogleTrendsApi.dailyTrends({
    geo: config.googleTrends.geo,
    lang: config.googleTrends.lang,
  })) as GoogleTrendsDailyResponse;

  return normalizeGoogleDailyTrends(payload, options.ingestedAt).slice(
    0,
    options.limit,
  );
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

async function fetchTikTokSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (!config.tiktok.clientKey || !config.tiktok.clientSecret) {
    throw new Error("Missing TikTok Research API environment variables.");
  }

  const accessToken = await getTikTokAccessToken(config);
  const dateRange = getUtcDateRange(config.tiktok.lookbackDays);
  const url = buildUrl(config.tiktok.queryEndpoint, {
    fields: config.tiktok.fields.join(","),
  });
  const payload = await fetchJson<TikTokQueryResponse>(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: buildTikTokResearchQuery(config),
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        max_count: Math.min(Math.max(options.limit, 1), 100),
        is_random: false,
      }),
    },
    config.requestTimeoutMs,
  );
  const videos = payload.data?.videos ?? payload.videos ?? [];

  return videos.slice(0, options.limit).map((video) => {
    const title =
      video.video_description?.trim() ||
      (video.id ? `TikTok video ${video.id}` : "Untitled TikTok video");

    return {
      source: "tiktok",
      timestamp: normalizeTikTokTimestamp(video.create_time) ?? options.ingestedAt,
      ingestedAt: options.ingestedAt,
      title,
      content: video.video_description || undefined,
      engagement: sumNumbers([
        video.view_count,
        video.like_count,
        video.comment_count,
        video.share_count,
        video.favorites_count,
      ]),
      url:
        video.username && video.id
          ? `https://www.tiktok.com/@${video.username}/video/${video.id}`
          : undefined,
      metadata: {
        id: video.id ?? null,
        username: video.username ?? null,
        regionCode: video.region_code ?? null,
        views: video.view_count ?? null,
        likes: video.like_count ?? null,
        comments: video.comment_count ?? null,
        shares: video.share_count ?? null,
        hashtags: video.hashtag_names?.join(",") ?? null,
      },
      raw: video,
    };
  });
}

async function fetchTwitterSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (!config.twitter.bearerToken) {
    throw new Error("Missing TWITTER_BEARER_TOKEN.");
  }

  const url = buildUrl(config.twitter.endpoint, {
    query: config.twitter.query,
    max_results: Math.min(Math.max(options.limit, 10), 100),
    "tweet.fields":
      "created_at,public_metrics,author_id,lang,possibly_sensitive,context_annotations,entities",
    expansions: "author_id",
  });
  const payload = await fetchJson<TwitterRecentSearchResponse>(
    url,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.twitter.bearerToken}`,
      },
    },
    config.requestTimeoutMs,
  );

  return (payload.data ?? []).slice(0, options.limit).map((tweet) => ({
    source: "twitter",
    timestamp: normalizeDate(tweet.created_at) ?? options.ingestedAt,
    ingestedAt: options.ingestedAt,
    title: tweet.text,
    content: tweet.text,
    engagement: sumNumbers([
      tweet.public_metrics?.retweet_count,
      tweet.public_metrics?.reply_count,
      tweet.public_metrics?.like_count,
      tweet.public_metrics?.quote_count,
      tweet.public_metrics?.bookmark_count,
      tweet.public_metrics?.impression_count,
    ]),
    url: `https://twitter.com/i/web/status/${tweet.id}`,
    metadata: {
      id: tweet.id,
      authorId: tweet.author_id ?? null,
      language: tweet.lang ?? null,
      possiblySensitive: tweet.possibly_sensitive ?? null,
    },
    raw: tweet,
  }));
}

async function fetchWsjSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (config.wsj.apiUrl && config.wsj.apiKey) {
    return fetchPublisherApiSignals({
      source: "wsj",
      provider: "Wall Street Journal",
      apiUrl: config.wsj.apiUrl,
      apiKey: config.wsj.apiKey,
      userAgent: config.wsj.userAgent,
      config,
      options,
    });
  }

  return fetchPublisherRssSignals({
    source: "wsj",
    provider: "Wall Street Journal",
    rssUrls: config.wsj.rssUrls,
    userAgent: config.wsj.userAgent,
    config,
    options,
  });
}

async function fetchNytSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (!config.nyt.apiKey) {
    throw new Error("Missing NYT_API_KEY.");
  }

  const url = buildUrl(
    `${config.nyt.endpoint.replace(/\/$/, "")}/${config.nyt.section}.json`,
    {
      "api-key": config.nyt.apiKey,
    },
  );
  const payload = await fetchJson<NytTopStoriesResponse>(
    url,
    { headers: { Accept: "application/json" } },
    config.requestTimeoutMs,
  );

  return (payload.results ?? []).slice(0, options.limit).map((article) => ({
    source: "nyt",
    timestamp: normalizeDate(article.published_date) ?? options.ingestedAt,
    ingestedAt: options.ingestedAt,
    title: article.title,
    content: article.abstract || undefined,
    url: article.url,
    metadata: {
      section: article.section ?? null,
      subsection: article.subsection ?? null,
      byline: article.byline ?? null,
      itemType: article.item_type ?? null,
      updatedDate: article.updated_date ?? null,
      materialTypeFacet: article.material_type_facet ?? null,
    },
    raw: article,
  }));
}

async function fetchWashingtonPostSignals(
  config: IngestionConfig,
  options: { ingestedAt: string; limit: number },
): Promise<RawSignalRecord[]> {
  if (config.washingtonPost.apiUrl && config.washingtonPost.apiKey) {
    return fetchPublisherApiSignals({
      source: "washington-post",
      provider: "Washington Post",
      apiUrl: config.washingtonPost.apiUrl,
      apiKey: config.washingtonPost.apiKey,
      userAgent: config.washingtonPost.userAgent,
      config,
      options,
    });
  }

  return fetchPublisherRssSignals({
    source: "washington-post",
    provider: "Washington Post",
    rssUrls: config.washingtonPost.rssUrls,
    userAgent: config.washingtonPost.userAgent,
    config,
    options,
  });
}

async function fetchPublisherApiSignals(input: {
  source: IngestSourceId;
  provider: string;
  apiUrl: string;
  apiKey: string;
  userAgent?: string;
  config: IngestionConfig;
  options: { ingestedAt: string; limit: number };
}): Promise<RawSignalRecord[]> {
  const url = buildUrl(input.apiUrl, {
    limit: input.options.limit,
    api_key: input.apiKey,
  });
  const payload = await fetchJson<unknown>(
    url,
    {
      headers: buildPublisherHeaders(input.apiKey, input.userAgent),
    },
    input.config.requestTimeoutMs,
  );

  return normalizePublisherJson(
    payload,
    input.source,
    input.provider,
    input.options.ingestedAt,
  ).slice(0, input.options.limit);
}

async function fetchPublisherRssSignals(input: {
  source: IngestSourceId;
  provider: string;
  rssUrls: string[];
  userAgent?: string;
  config: IngestionConfig;
  options: { ingestedAt: string; limit: number };
}): Promise<RawSignalRecord[]> {
  const feedResults = await Promise.all(
    input.rssUrls.map(async (feedUrl) => {
      const xml = await fetchText(
        feedUrl,
        {
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml",
            ...(input.userAgent ? { "User-Agent": input.userAgent } : {}),
          },
        },
        input.config.requestTimeoutMs,
      );

      return parsePublisherFeedXml(
        xml,
        input.source,
        input.provider,
        feedUrl,
        input.options.ingestedAt,
      );
    }),
  );

  return dedupeSignals(feedResults.flat())
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, input.options.limit);
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

async function getTikTokAccessToken(
  config: IngestionConfig,
): Promise<string> {
  const payload = await fetchJson<TikTokTokenResponse>(
    config.tiktok.tokenEndpoint,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: config.tiktok.clientKey || "",
        client_secret: config.tiktok.clientSecret || "",
        grant_type: "client_credentials",
      }).toString(),
    },
    config.requestTimeoutMs,
  );
  const accessToken = payload.access_token ?? payload.data?.access_token;

  if (!accessToken) {
    throw new Error("TikTok did not return an access token.");
  }

  return accessToken;
}

function buildTikTokResearchQuery(config: IngestionConfig): TikTokResearchQuery {
  const and: TikTokResearchCondition[] = [
    {
      operation: "IN",
      field_name: "region_code",
      field_values: config.tiktok.regionCodes,
    },
  ];

  if (config.tiktok.keywords.length > 0) {
    and.push({
      operation: "IN",
      field_name: "keyword",
      field_values: config.tiktok.keywords,
    });
  }

  return { and };
}

function normalizeGoogleDailyTrends(
  payload: GoogleTrendsDailyResponse,
  ingestedAt: string,
): RawSignalRecord[] {
  const stories = payload.data?.allTrendingStories ?? [];

  return stories.map((story) => ({
    source: "google-trends",
    timestamp:
      typeof story.startTime === "number"
        ? unixSecondsToIso(story.startTime)
        : ingestedAt,
      ingestedAt,
    title: story.title,
    content: story.articles?.map((article) => article.title).join("\n") || undefined,
    engagement: parseApproximateCount(story.traffic),
    url: normalizeGoogleTrendsShareUrl(story.shareUrl),
    metadata: {
      traffic: story.traffic,
      endTime: story.endTime ?? null,
      imageUrl: story.image?.imageUrl ?? null,
      imageSource: story.image?.source ?? null,
      articleCount: story.articles?.length ?? 0,
    },
    raw: story,
  }));
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

    if (isRecord(value)) {
      const nestedItems = findFirstArray(value, keys);

      if (nestedItems.length > 0) {
        return nestedItems;
      }
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

function normalizePublisherJson(
  payload: unknown,
  source: IngestSourceId,
  provider: string,
  ingestedAt: string,
): RawSignalRecord[] {
  const items = findFirstArray(payload, [
    "articles",
    "results",
    "items",
    "data",
    "documents",
    "stories",
  ]);

  return items
    .map((item) => normalizeRecordObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const title =
        readArticleTitle(item) ||
        readString(item, "name") ||
        `${provider} item`;

      return {
        source,
        timestamp:
          normalizeDate(readString(item, "publishedAt")) ??
          normalizeDate(readString(item, "published_date")) ??
          normalizeDate(readString(item, "publication_date")) ??
          normalizeDate(readString(item, "date")) ??
          ingestedAt,
        ingestedAt,
        title,
        content:
          readString(item, "description") ||
          readString(item, "abstract") ||
          readString(item, "summary") ||
          readString(item, "snippet") ||
          undefined,
        engagement:
          readNumber(item, "engagement") ??
          readNumber(item, "views") ??
          readNumber(item, "view_count") ??
          undefined,
        url:
          readString(item, "url") ||
          readString(item, "web_url") ||
          readString(item, "link") ||
          undefined,
        metadata: {
          provider,
          section:
            readString(item, "section") ||
            readString(item, "section_name") ||
            null,
          author:
            readString(item, "author") ||
            readString(item, "byline") ||
            null,
        },
        raw: item,
      };
    });
}

function parsePublisherFeedXml(
  xml: string,
  source: IngestSourceId,
  provider: string,
  feedUrl: string,
  ingestedAt: string,
): RawSignalRecord[] {
  const entries =
    xml.match(/<item[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
    [];

  return entries.map((entryXml) => {
    const title = stripHtml(readXmlTag(entryXml, "title")) || `${provider} item`;
    const content = stripHtml(
      readXmlTag(entryXml, "description") ||
        readXmlTag(entryXml, "content:encoded") ||
        readXmlTag(entryXml, "summary"),
    );
    const publishedAt =
      readXmlTag(entryXml, "pubDate") ||
      readXmlTag(entryXml, "dc:date") ||
      readXmlTag(entryXml, "published") ||
      readXmlTag(entryXml, "updated");

    return {
      source,
      timestamp: normalizeDate(publishedAt) ?? ingestedAt,
      ingestedAt,
      title,
      content: content || undefined,
      url: readXmlLink(entryXml) || undefined,
      metadata: {
        provider,
        feedUrl,
        guid: readXmlTag(entryXml, "guid") || readXmlTag(entryXml, "id") || null,
        category: readXmlTag(entryXml, "category") || null,
      },
      raw: entryXml,
    };
  });
}

function dedupeSignals(records: RawSignalRecord[]): RawSignalRecord[] {
  const recordsByKey = new Map<string, RawSignalRecord>();

  for (const record of records) {
    const key = record.url || `${record.source}:${record.title}`;

    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, record);
    }
  }

  return [...recordsByKey.values()];
}

function buildPublisherHeaders(
  apiKey: string,
  userAgent: string | undefined,
): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
    ...(userAgent ? { "User-Agent": userAgent } : {}),
  };
}

function readArticleTitle(item: Record<string, unknown>): string | undefined {
  const title = readString(item, "title");

  if (title) {
    return title;
  }

  const headline = item.headline;

  if (typeof headline === "string") {
    return headline;
  }

  if (isRecord(headline)) {
    return readString(headline, "main") || readString(headline, "print_headline");
  }

  return undefined;
}

function readXmlLink(xml: string): string {
  const link = readXmlTag(xml, "link");

  if (link) {
    return link;
  }

  const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);

  return decodeXml(hrefMatch?.[1]?.trim() ?? "");
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

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  const multiplier =
    match[2] === "B"
      ? 1_000_000_000
      : match[2] === "M"
        ? 1_000_000
        : match[2] === "K"
          ? 1_000
          : 1;

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

function normalizeTikTokTimestamp(value: number | string | undefined): string | undefined {
  if (typeof value === "number") {
    return unixSecondsToIso(value);
  }

  return normalizeDate(value);
}

function getUtcDateRange(lookbackDays: number): {
  startDate: string;
  endDate: string;
} {
  const safeLookbackDays = Math.min(Math.max(lookbackDays, 1), 30);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - safeLookbackDays);

  return {
    startDate: formatUtcDate(start),
    endDate: formatUtcDate(end),
  };
}

function formatUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
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

function normalizeGoogleTrendsShareUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://trends.google.com/trends/explore?q=${encodeURIComponent(value)}`;
}

function sumNumbers(values: Array<number | undefined>): number | undefined {
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0);

  return sum > 0 ? sum : undefined;
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

type GoogleTrendsDailyResponse = {
  data?: {
    allTrendingStories?: Array<{
      title: string;
      traffic: string;
      shareUrl?: string;
      startTime?: number;
      endTime?: number;
      image?: {
        newsUrl?: string;
        source?: string;
        imageUrl?: string;
      };
      articles?: Array<{
        title: string;
        url?: string;
        source?: string;
        time?: string;
        snippet?: string;
      }>;
    }>;
  };
};

type TikTokTokenResponse = {
  access_token?: string;
  data?: {
    access_token?: string;
  };
};

type TikTokResearchCondition = {
  operation: "EQ" | "IN" | "GT" | "GTE" | "LT" | "LTE";
  field_name: string;
  field_values: string[];
};

type TikTokResearchQuery = {
  and: TikTokResearchCondition[];
};

type TikTokQueryResponse = {
  data?: {
    videos?: TikTokVideo[];
  };
  videos?: TikTokVideo[];
};

type TikTokVideo = {
  id?: string;
  video_description?: string;
  create_time?: number | string;
  region_code?: string;
  share_count?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  favorites_count?: number;
  hashtag_names?: string[];
  username?: string;
};

type TwitterRecentSearchResponse = {
  data?: TwitterTweet[];
};

type TwitterTweet = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  lang?: string;
  possibly_sensitive?: boolean;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
};

type NytTopStoriesResponse = {
  results?: Array<{
    title: string;
    abstract?: string;
    url?: string;
    published_date?: string;
    updated_date?: string;
    section?: string;
    subsection?: string;
    byline?: string;
    item_type?: string;
    material_type_facet?: string;
  }>;
};
