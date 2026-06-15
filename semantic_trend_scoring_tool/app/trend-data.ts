export const STORAGE_KEY = "semantic-trend-snapshots-v1";

export type PillarId =
  | "politics"
  | "sports"
  | "entertainment"
  | "science"
  | "business"
  | "lifestyle";

export type TopicProvider = "openai" | "local";

export type TopicRequestDocument = {
  id: string;
  text: string;
  source?: string;
  timestamp?: string;
};

export type TopicUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type DocumentTopic = {
  label: string;
  confidence: number;
  relevance: number;
  evidence: string[];
};

export type DocumentTopics = {
  id: string;
  topics: DocumentTopic[];
};

export type CorpusTopic = {
  label: string;
  score: number;
  documentCount: number;
  documentIds: string[];
};

export type TopicExtractionResponse = {
  requestId: string;
  provider: TopicProvider;
  degraded: boolean;
  warnings: string[];
  documents: DocumentTopics[];
  topics: CorpusTopic[];
  usage: TopicUsage | null;
};

export type TopicContribution = {
  label: string;
  score: number;
  weight: number;
  documentCount: number;
  documentIds: string[];
  confidence: number;
  relevance: number;
  evidence: string[];
};

export type PillarScore = {
  id: PillarId;
  label: string;
  shortLabel: string;
  color: string;
  score: number;
  contributions: TopicContribution[];
};

export type TrendSnapshot = {
  id: string;
  date: string;
  label: string;
  provider: TopicProvider;
  degraded: boolean;
  requestId: string;
  warnings: string[];
  usage: TopicUsage | null;
  documents: TopicRequestDocument[];
  rawTopics: CorpusTopic[];
  pillars: PillarScore[];
};

export type ExtractionOptions = {
  snapshotDate: string;
  bearerToken: string;
  maxTopicsPerDocument: number;
  maxCorpusTopics: number;
  documents: TopicRequestDocument[];
};

export const PILLARS: Array<{
  id: PillarId;
  label: string;
  shortLabel: string;
  color: string;
  keywords: string[];
}> = [
  {
    id: "politics",
    label: "Politics & Civic Life",
    shortLabel: "Politics",
    color: "#2f6f73",
    keywords: [
      "election",
      "elections",
      "policy",
      "policies",
      "civic",
      "government",
      "congress",
      "campaign",
      "debate",
      "national",
      "movement",
      "social movement",
      "law",
      "regulation",
      "regulatory",
      "vote",
      "voter",
      "court",
    ],
  },
  {
    id: "sports",
    label: "Sports & Athletics",
    shortLabel: "Sports",
    color: "#b27743",
    keywords: [
      "sports",
      "athletic",
      "athletics",
      "super bowl",
      "olympic",
      "olympics",
      "world cup",
      "tournament",
      "league",
      "team",
      "match",
      "championship",
      "record",
      "basketball",
      "football",
      "soccer",
      "tennis",
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment & Pop Culture",
    shortLabel: "Culture",
    color: "#7c6aa6",
    keywords: [
      "movie",
      "movies",
      "music",
      "celebrity",
      "streaming",
      "series",
      "meme",
      "memes",
      "viral",
      "creator",
      "social media",
      "album",
      "film",
      "festival",
      "pop culture",
      "gaming",
    ],
  },
  {
    id: "science",
    label: "Science & Technology",
    shortLabel: "Science",
    color: "#2f8a88",
    keywords: [
      "ai",
      "agent",
      "agents",
      "artificial intelligence",
      "technology",
      "tech",
      "consumer tech",
      "space",
      "launch",
      "science",
      "scientific",
      "research",
      "breakthrough",
      "synthetic media",
      "software",
      "robot",
      "chip",
      "model",
      "climate",
      "energy storage",
      "battery",
    ],
  },
  {
    id: "business",
    label: "Business & Finance",
    shortLabel: "Business",
    color: "#4c6f93",
    keywords: [
      "market",
      "markets",
      "finance",
      "financial",
      "business",
      "crypto",
      "inflation",
      "consumer spending",
      "retail",
      "demand",
      "workplace",
      "supply chain",
      "stock",
      "earnings",
      "startup",
      "jobs",
      "labor",
      "price",
      "pricing",
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle & Wellness",
    shortLabel: "Lifestyle",
    color: "#8a7d4d",
    keywords: [
      "health",
      "wellness",
      "fashion",
      "travel",
      "food",
      "relationship",
      "relationships",
      "fitness",
      "diet",
      "sleep",
      "beauty",
      "home",
      "lifestyle",
      "mental health",
      "nutrition",
    ],
  },
];

export const DEFAULT_OPTIONS: ExtractionOptions = {
  snapshotDate: "2026-06-12",
  bearerToken: "",
  maxTopicsPerDocument: 5,
  maxCorpusTopics: 10,
  documents: [
    {
      id: "doc-1",
      source: "Signal wire",
      timestamp: "2026-06-12T09:00:00.000Z",
      text:
        "Consumer AI agents are moving from demo loops into practical booking and shopping tasks. Analysts note workplace teams are creating guardrails for synthetic media policy while chip supply chains remain tight.",
    },
    {
      id: "doc-2",
      source: "Daily crawl",
      timestamp: "2026-06-12T10:15:00.000Z",
      text:
        "Space launch cadence is accelerating after a run of successful reusable rocket missions. Energy storage projects and grid battery contracts are drawing business attention as summer demand climbs.",
    },
    {
      id: "doc-3",
      source: "Social pulse",
      timestamp: "2026-06-12T11:30:00.000Z",
      text:
        "Sports culture is tracking tournament clips, while streaming releases and creator memes are shaping the entertainment conversation. Health travel and food trends are also rising in lifestyle channels.",
    },
  ],
};

const SAMPLE_RAW_TOPICS: Record<string, CorpusTopic[]> = {
  "2026-06-08": [
    topic("Election Policy Debates", 0.64, 4),
    topic("Tournament Clips", 0.42, 3),
    topic("Streaming Releases", 0.5, 3),
    topic("AI Breakthroughs", 0.55, 4),
    topic("Market Inflation", 0.58, 3),
    topic("Travel Food Trends", 0.39, 2),
  ],
  "2026-06-09": [
    topic("National News Policy", 0.68, 4),
    topic("Viral Athletic Achievements", 0.5, 4),
    topic("Celebrity Streaming Releases", 0.54, 3),
    topic("Consumer Tech Launches", 0.62, 4),
    topic("Crypto Market Trends", 0.61, 3),
    topic("Health Fashion Travel", 0.43, 2),
  ],
  "2026-06-10": [
    topic("Social Movements", 0.56, 3),
    topic("World Cup Culture", 0.57, 4),
    topic("Meme Cycles", 0.6, 4),
    topic("Space Exploration", 0.66, 5),
    topic("Consumer Spending", 0.52, 3),
    topic("Wellness Food Trends", 0.48, 2),
  ],
  "2026-06-11": [
    topic("Election Campaign Strategy", 0.62, 3),
    topic("Major Tournaments", 0.46, 3),
    topic("Music Celebrity Trends", 0.58, 4),
    topic("Synthetic Media Policy", 0.7, 5),
    topic("Workplace Culture", 0.59, 4),
    topic("Relationship Health Trends", 0.5, 3),
  ],
  "2026-06-12": [
    topic("Consumer AI Agents", 0.78, 5),
    topic("Space Launch Cadence", 0.67, 4),
    topic("Synthetic Media Policy", 0.64, 4),
    topic("Energy Storage", 0.58, 3),
    topic("Retail Demand", 0.45, 3),
    topic("Sports Culture", 0.42, 2),
    topic("Streaming Releases", 0.39, 2),
    topic("Health Travel", 0.35, 2),
    topic("Policy Debates", 0.44, 3),
  ],
};

export const SEED_SNAPSHOTS: TrendSnapshot[] = Object.entries(SAMPLE_RAW_TOPICS).map(
  ([date, topics], index) =>
    buildSnapshotFromResponse({
      date,
      documents: DEFAULT_OPTIONS.documents,
      response: {
        requestId: `seed-${date}`,
        provider: index === 4 ? "local" : "openai",
        degraded: index === 4,
        warnings:
          index === 4
            ? ["OPENAI_API_KEY is not configured; used local keyword fallback."]
            : [],
        topics,
        documents: sampleDocumentTopics(topics),
        usage:
          index === 4
            ? null
            : {
                inputTokens: 8420 + index * 315,
                outputTokens: 920 + index * 52,
                totalTokens: 9340 + index * 367,
              },
      },
    }),
);

export function buildSnapshotFromResponse({
  date,
  response,
  documents,
}: {
  date: string;
  response: TopicExtractionResponse;
  documents: TopicRequestDocument[];
}): TrendSnapshot {
  const pillars = PILLARS.map((pillar) => {
    const matches = response.topics
      .filter((candidate) => topicMatchesPillar(candidate.label, pillar.keywords))
      .sort((left, right) => right.score - left.score);
    const total = matches.reduce((sum, candidate) => sum + candidate.score, 0);
    const score = Math.min(1, total / 1.45);

    return {
      id: pillar.id,
      label: pillar.label,
      shortLabel: pillar.shortLabel,
      color: pillar.color,
      score: round(score),
      contributions: matches.map((candidate) =>
        buildContribution(candidate, response.documents, total),
      ),
    };
  });

  return {
    id: response.requestId || `${date}-${Date.now()}`,
    date,
    label: formatDateLabel(date),
    provider: response.provider,
    degraded: response.degraded,
    requestId: response.requestId,
    warnings: response.warnings,
    usage: response.usage,
    documents,
    rawTopics: response.topics,
    pillars,
  };
}

export function sortSnapshots(snapshots: TrendSnapshot[]) {
  return [...snapshots].sort((left, right) => left.date.localeCompare(right.date));
}

export function getSnapshotLabel(date: string) {
  return formatDateLabel(date);
}

export function scoreForPillar(snapshot: TrendSnapshot, pillarId: PillarId) {
  return snapshot.pillars.find((pillar) => pillar.id === pillarId)?.score ?? 0;
}

function buildContribution(
  topicValue: CorpusTopic,
  documents: DocumentTopics[],
  pillarTotal: number,
): TopicContribution {
  const matches = documents.flatMap((document) =>
    document.topics
      .filter((candidate) => normalize(candidate.label) === normalize(topicValue.label))
      .map((candidate) => ({
        documentId: document.id,
        ...candidate,
      })),
  );
  const confidence =
    matches.length > 0
      ? average(matches.map((candidate) => candidate.confidence))
      : topicValue.score;
  const relevance =
    matches.length > 0
      ? average(matches.map((candidate) => candidate.relevance))
      : topicValue.score;
  const evidence = matches.flatMap((candidate) => candidate.evidence).slice(0, 3);

  return {
    label: topicValue.label,
    score: round(topicValue.score),
    weight: round(pillarTotal === 0 ? 0 : topicValue.score / pillarTotal),
    documentCount: topicValue.documentCount,
    documentIds: topicValue.documentIds,
    confidence: round(confidence),
    relevance: round(relevance),
    evidence:
      evidence.length > 0
        ? evidence
        : [`${topicValue.label} appeared across ${topicValue.documentCount} source documents.`],
  };
}

function topicMatchesPillar(label: string, keywords: string[]) {
  const normalized = normalize(label);

  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function sampleDocumentTopics(topics: CorpusTopic[]): DocumentTopics[] {
  return DEFAULT_OPTIONS.documents.map((document, documentIndex) => ({
    id: document.id,
    topics: topics
      .filter((topicValue, topicIndex) =>
        topicValue.documentIds.includes(document.id) || topicIndex % 3 === documentIndex,
      )
      .slice(0, 5)
      .map((topicValue) => ({
        label: topicValue.label,
        confidence: round(Math.min(0.98, topicValue.score + 0.14)),
        relevance: round(Math.min(0.99, topicValue.score + 0.1)),
        evidence: [sampleEvidence(topicValue.label, document.source ?? document.id)],
      })),
  }));
}

function sampleEvidence(label: string, source: string) {
  return `${source} mentions ${label.toLowerCase()} as a recurring signal in the daily trend set.`;
}

function topic(label: string, score: number, documentCount: number): CorpusTopic {
  const documentIds = DEFAULT_OPTIONS.documents
    .slice(0, Math.max(1, Math.min(documentCount, DEFAULT_OPTIONS.documents.length)))
    .map((document) => document.id);

  return {
    label,
    score,
    documentCount: documentIds.length,
    documentIds,
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
