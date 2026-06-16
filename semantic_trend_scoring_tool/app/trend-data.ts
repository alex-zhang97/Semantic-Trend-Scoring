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

export type DominanceSource = "topic_score";

export type PillarScore = {
  id: PillarId;
  label: string;
  shortLabel: string;
  color: string;
  rawDominance: number;
  dominanceSource: DominanceSource;
  score: number;
  contributions: TopicContribution[];
};

export type CompanyProfile = {
  name: string;
  industry: string;
};

export type RecommendationTier = "Monitor" | "Evaluate" | "Activate";

export type OpportunityScore = {
  companyName: string;
  industry: string;
  scoreOutOf10: number;
  tier: RecommendationTier;
  recommendation: string;
  industryFit: number;
  waterCoolerDominance: number;
};

export type OpportunityRecommendation = {
  tier: RecommendationTier;
  recommendation: string;
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

export const COMPANY_PROFILE: CompanyProfile = {
  name: "Best Western",
  industry: "Hospitality & Travel",
};

const HOSPITALITY_RELEVANCE: Record<PillarId, number> = {
  politics: 0.35,
  sports: 0.7,
  entertainment: 0.75,
  science: 0.55,
  business: 0.8,
  lifestyle: 0.95,
};

export const DEFAULT_OPTIONS: ExtractionOptions = {
  snapshotDate: "2026-06-16",
  bearerToken: "",
  maxTopicsPerDocument: 5,
  maxCorpusTopics: 10,
  documents: [
    {
      id: "doc-1",
      source: "Signal wire",
      timestamp: "2026-06-16T09:00:00.000Z",
      text:
        "World Cup host-city travel, consumer spending, and event logistics are dominating daily public conversation. Analysts are also tracking election-policy debates and AI infrastructure demand as corporate teams plan summer campaigns.",
    },
    {
      id: "doc-2",
      source: "Daily crawl",
      timestamp: "2026-06-16T10:15:00.000Z",
      text:
        "Sports tourism is blending with restaurant, hotel, and local transportation chatter. Budget-sensitive travelers are comparing shorter trips, loyalty offers, and regional stays around major events.",
    },
    {
      id: "doc-3",
      source: "Social pulse",
      timestamp: "2026-06-16T11:30:00.000Z",
      text:
        "Creator clips, food awards, wellness travel, and AI-agent demos are moving across social channels. The strongest opportunities combine real-time public attention with practical hospitality offers.",
    },
  ],
};

const YEAR_SEED_START_DATE = "2025-06-17";
const YEAR_SEED_DAYS = 365;
const MS_PER_DAY = 86_400_000;
const LEGACY_SEED_REQUEST_IDS = new Set([
  "seed-2026-06-08",
  "seed-2026-06-09",
  "seed-2026-06-10",
  "seed-2026-06-11",
  "seed-2026-06-12",
]);

type EventAnchor = {
  date: string;
  pillarIds: PillarId[];
  topicLabel: string;
  peakScore: number;
  leadInDays: number;
  decayDays: number;
  evidence: string;
  documentCount?: number;
};

type BaselineTopic = {
  topicLabel: string;
  baseScore: number;
  seasonalAmplitude: number;
  phase: number;
  evidence: string;
  documentCount: number;
};

const BASELINE_TOPICS: BaselineTopic[] = [
  {
    topicLabel: "Election Policy Debates",
    baseScore: 0.19,
    seasonalAmplitude: 0.07,
    phase: 1.1,
    evidence: "generated seed signal for civic coverage and campaign-policy chatter",
    documentCount: 2,
  },
  {
    topicLabel: "Sports Tournament Clips",
    baseScore: 0.18,
    seasonalAmplitude: 0.08,
    phase: 0.2,
    evidence: "generated seed signal for tournament highlights and fan conversation",
    documentCount: 2,
  },
  {
    topicLabel: "Streaming Music Releases",
    baseScore: 0.2,
    seasonalAmplitude: 0.06,
    phase: 2.2,
    evidence: "generated seed signal for entertainment releases and creator reaction",
    documentCount: 2,
  },
  {
    topicLabel: "Consumer AI Agents",
    baseScore: 0.24,
    seasonalAmplitude: 0.08,
    phase: 3.7,
    evidence: "generated seed signal for AI agent demos and consumer technology adoption",
    documentCount: 3,
  },
  {
    topicLabel: "Market Inflation Pricing",
    baseScore: 0.22,
    seasonalAmplitude: 0.07,
    phase: 4.4,
    evidence: "generated seed signal for consumer prices, market sentiment, and retail demand",
    documentCount: 3,
  },
  {
    topicLabel: "Wellness Travel Food Trends",
    baseScore: 0.21,
    seasonalAmplitude: 0.1,
    phase: 5.1,
    evidence: "generated seed signal for wellness, food, and travel planning behavior",
    documentCount: 3,
  },
];

const EVENT_ANCHORS: EventAnchor[] = [
  {
    date: "2025-06-20",
    pillarIds: ["sports", "business", "lifestyle"],
    topicLabel: "FIFA World Cup Soccer Travel Demand",
    peakScore: 0.56,
    leadInDays: 8,
    decayDays: 16,
    evidence: "expanded club soccer event travel lifted host-city sports and hotel chatter",
    documentCount: 3,
  },
  {
    date: "2025-07-04",
    pillarIds: ["lifestyle", "business"],
    topicLabel: "Holiday Travel Pricing",
    peakScore: 0.48,
    leadInDays: 7,
    decayDays: 9,
    evidence: "summer holiday demand pushed travel and pricing into mainstream conversation",
  },
  {
    date: "2025-07-13",
    pillarIds: ["sports", "entertainment", "lifestyle"],
    topicLabel: "World Cup Championship Soccer Culture",
    peakScore: 0.6,
    leadInDays: 10,
    decayDays: 12,
    evidence: "championship viewing, clips, and travel plans converged around soccer culture",
  },
  {
    date: "2025-08-08",
    pillarIds: ["science", "business"],
    topicLabel: "GPT-5 AI Model Launch",
    peakScore: 0.78,
    leadInDays: 9,
    decayDays: 20,
    evidence: "frontier AI release drove agent, model, and enterprise productivity discussion",
    documentCount: 3,
  },
  {
    date: "2025-08-18",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Back To School Retail Demand",
    peakScore: 0.44,
    leadInDays: 10,
    decayDays: 14,
    evidence: "families compared retail spending, travel timing, and value-oriented purchases",
  },
  {
    date: "2025-09-10",
    pillarIds: ["sports", "business", "lifestyle"],
    topicLabel: "World Cup Ticket Dynamic Pricing Travel",
    peakScore: 0.62,
    leadInDays: 12,
    decayDays: 24,
    evidence: "World Cup ticket phases and dynamic pricing created travel-planning attention",
    documentCount: 3,
  },
  {
    date: "2025-09-22",
    pillarIds: ["entertainment", "lifestyle"],
    topicLabel: "Fall Streaming Series Pop Culture",
    peakScore: 0.46,
    leadInDays: 8,
    decayDays: 18,
    evidence: "new streaming slates and creator recaps fueled seasonal pop-culture signals",
  },
  {
    date: "2025-10-06",
    pillarIds: ["science", "business"],
    topicLabel: "AI Agent Builder Workflows",
    peakScore: 0.72,
    leadInDays: 8,
    decayDays: 22,
    evidence: "developer tooling and agent workflow launches pushed AI into business planning",
    documentCount: 3,
  },
  {
    date: "2025-10-21",
    pillarIds: ["science", "business"],
    topicLabel: "ChatGPT Browser Consumer Tech",
    peakScore: 0.65,
    leadInDays: 6,
    decayDays: 18,
    evidence: "browser-based AI assistants brought consumer tech and agent habits into focus",
  },
  {
    date: "2025-10-31",
    pillarIds: ["entertainment", "lifestyle"],
    topicLabel: "Halloween Creator Meme Cycles",
    peakScore: 0.4,
    leadInDays: 7,
    decayDays: 7,
    evidence: "costume, creator, and meme trends drove short-lived seasonal conversation",
  },
  {
    date: "2025-11-04",
    pillarIds: ["politics"],
    topicLabel: "Local Election Policy Results",
    peakScore: 0.52,
    leadInDays: 10,
    decayDays: 16,
    evidence: "off-year elections and local ballot issues raised civic-life attention",
  },
  {
    date: "2025-11-24",
    pillarIds: ["science", "politics", "business"],
    topicLabel: "National AI Research Policy",
    peakScore: 0.64,
    leadInDays: 8,
    decayDays: 18,
    evidence: "national AI research initiatives linked science, policy, and investment themes",
    documentCount: 3,
  },
  {
    date: "2025-11-28",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Holiday Retail Consumer Spending",
    peakScore: 0.58,
    leadInDays: 12,
    decayDays: 22,
    evidence: "holiday shopping and travel spending pushed retail demand to the foreground",
  },
  {
    date: "2025-12-05",
    pillarIds: ["sports", "business", "lifestyle"],
    topicLabel: "World Cup Draw Travel Planning",
    peakScore: 0.66,
    leadInDays: 14,
    decayDays: 28,
    evidence: "World Cup draw attention turned into host-city travel and hotel planning",
    documentCount: 3,
  },
  {
    date: "2025-12-12",
    pillarIds: ["entertainment", "lifestyle"],
    topicLabel: "Streaming Tour Documentary Music",
    peakScore: 0.52,
    leadInDays: 8,
    decayDays: 18,
    evidence: "music documentary releases linked fandom, streaming, and destination culture",
  },
  {
    date: "2025-12-26",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Holiday Travel Disruption Demand",
    peakScore: 0.5,
    leadInDays: 9,
    decayDays: 13,
    evidence: "post-holiday travel, delays, and family trip planning shaped consumer chatter",
  },
  {
    date: "2026-01-09",
    pillarIds: ["science", "politics"],
    topicLabel: "Synthetic Media Regulation Debate",
    peakScore: 0.58,
    leadInDays: 6,
    decayDays: 18,
    evidence: "deepfake and synthetic-media safety concerns raised technology regulation talk",
  },
  {
    date: "2026-01-15",
    pillarIds: ["lifestyle", "business"],
    topicLabel: "New Year Wellness Travel",
    peakScore: 0.46,
    leadInDays: 10,
    decayDays: 18,
    evidence: "wellness resolutions, quiet trips, and restorative stays lifted lifestyle signals",
  },
  {
    date: "2026-02-01",
    pillarIds: ["entertainment", "lifestyle"],
    topicLabel: "Grammy Music Awards Culture",
    peakScore: 0.62,
    leadInDays: 9,
    decayDays: 11,
    evidence: "music awards, performances, and social clips produced a pop-culture spike",
  },
  {
    date: "2026-02-06",
    pillarIds: ["sports", "business", "lifestyle"],
    topicLabel: "Winter Olympic Travel Logistics",
    peakScore: 0.82,
    leadInDays: 16,
    decayDays: 24,
    evidence: "Olympic opening week blended sports attention with international travel logistics",
    documentCount: 3,
  },
  {
    date: "2026-02-08",
    pillarIds: ["sports", "entertainment", "business", "lifestyle"],
    topicLabel: "Super Bowl Sports Hospitality",
    peakScore: 0.88,
    leadInDays: 14,
    decayDays: 12,
    evidence: "Super Bowl week concentrated sports, halftime culture, hotel stays, and dining",
    documentCount: 3,
  },
  {
    date: "2026-02-14",
    pillarIds: ["politics", "business"],
    topicLabel: "Government Funding Policy Debate",
    peakScore: 0.56,
    leadInDays: 8,
    decayDays: 28,
    evidence: "federal funding negotiations kept policy and operations risk in conversation",
  },
  {
    date: "2026-02-19",
    pillarIds: ["science", "business"],
    topicLabel: "AI Agent Index Research",
    peakScore: 0.54,
    leadInDays: 5,
    decayDays: 18,
    evidence: "agent capability research made enterprise AI safety and adoption more visible",
  },
  {
    date: "2026-02-22",
    pillarIds: ["sports", "lifestyle"],
    topicLabel: "Winter Olympics Closing Travel",
    peakScore: 0.7,
    leadInDays: 8,
    decayDays: 12,
    evidence: "closing ceremonies and return travel extended Olympic sports-tourism attention",
  },
  {
    date: "2026-02-28",
    pillarIds: ["entertainment"],
    topicLabel: "Music Awards Celebrity Trends",
    peakScore: 0.46,
    leadInDays: 6,
    decayDays: 10,
    evidence: "late-February awards discussion sustained celebrity and music conversation",
  },
  {
    date: "2026-03-03",
    pillarIds: ["politics"],
    topicLabel: "Primary Election Campaign Strategy",
    peakScore: 0.55,
    leadInDays: 10,
    decayDays: 20,
    evidence: "state primaries and campaign strategy raised national political attention",
  },
  {
    date: "2026-03-15",
    pillarIds: ["entertainment", "business", "lifestyle"],
    topicLabel: "Oscars Film Awards Travel",
    peakScore: 0.74,
    leadInDays: 12,
    decayDays: 16,
    evidence: "Oscars week combined film, celebrity, Los Angeles travel, and viewing parties",
    documentCount: 3,
  },
  {
    date: "2026-03-20",
    pillarIds: ["sports", "lifestyle"],
    topicLabel: "Basketball Tournament Travel",
    peakScore: 0.6,
    leadInDays: 10,
    decayDays: 18,
    evidence: "college basketball brackets and regional travel fueled sports conversation",
  },
  {
    date: "2026-04-10",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Spring Break Travel Demand",
    peakScore: 0.52,
    leadInDays: 14,
    decayDays: 15,
    evidence: "spring trips kept hotel pricing, road travel, and family planning in focus",
  },
  {
    date: "2026-04-22",
    pillarIds: ["sports", "business", "lifestyle"],
    topicLabel: "World Cup Last Minute Ticket Sales",
    peakScore: 0.68,
    leadInDays: 10,
    decayDays: 26,
    evidence: "last-minute World Cup ticket phases renewed travel and pricing conversation",
    documentCount: 3,
  },
  {
    date: "2026-04-26",
    pillarIds: ["science", "politics"],
    topicLabel: "Synthetic Media Platform Policy",
    peakScore: 0.5,
    leadInDays: 7,
    decayDays: 14,
    evidence: "platform safety decisions kept AI media policy in public attention",
  },
  {
    date: "2026-05-05",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Summer Travel Affordability",
    peakScore: 0.62,
    leadInDays: 12,
    decayDays: 24,
    evidence: "travel-cost pressure pushed staycations, micro-breaks, and value offers higher",
    documentCount: 3,
  },
  {
    date: "2026-05-15",
    pillarIds: ["business", "lifestyle"],
    topicLabel: "Hotel Pricing Inflation",
    peakScore: 0.58,
    leadInDays: 8,
    decayDays: 20,
    evidence: "rising room rates and midscale value comparisons shaped hotel conversation",
  },
  {
    date: "2026-05-25",
    pillarIds: ["lifestyle", "business"],
    topicLabel: "Memorial Day Travel Food",
    peakScore: 0.54,
    leadInDays: 8,
    decayDays: 10,
    evidence: "long-weekend travel and dining plans lifted food, wellness, and lodging signals",
  },
  {
    date: "2026-06-01",
    pillarIds: ["science", "business"],
    topicLabel: "AI Infrastructure Spending",
    peakScore: 0.66,
    leadInDays: 7,
    decayDays: 20,
    evidence: "AI capex, chips, energy, and data-center capacity drove finance-tech chatter",
    documentCount: 3,
  },
  {
    date: "2026-06-09",
    pillarIds: ["politics", "business"],
    topicLabel: "DHS ICE Funding Policy",
    peakScore: 0.6,
    leadInDays: 7,
    decayDays: 18,
    evidence: "immigration enforcement funding debates lifted policy and labor-risk attention",
  },
  {
    date: "2026-06-11",
    pillarIds: ["sports", "business", "entertainment", "lifestyle"],
    topicLabel: "World Cup Opening Match Travel Demand",
    peakScore: 0.94,
    leadInDays: 24,
    decayDays: 30,
    evidence: "World Cup opening week dominated sports, travel, dining, and host-city logistics",
    documentCount: 3,
  },
  {
    date: "2026-06-15",
    pillarIds: ["entertainment", "lifestyle"],
    topicLabel: "James Beard Restaurant Awards Food Travel",
    peakScore: 0.48,
    leadInDays: 5,
    decayDays: 12,
    evidence: "restaurant awards connected food culture, chef travel, and city discovery",
  },
  {
    date: "2026-06-16",
    pillarIds: ["politics"],
    topicLabel: "Voting Rights Election Policy",
    peakScore: 0.62,
    leadInDays: 10,
    decayDays: 16,
    evidence: "voting-rights and election-administration debate raised civic-life dominance",
  },
];

export const SEED_SNAPSHOTS: TrendSnapshot[] = buildYearSeedSnapshots();

export function mergeSnapshotsWithSeedSnapshots(storedSnapshots: TrendSnapshot[]) {
  if (!Array.isArray(storedSnapshots) || storedSnapshots.length === 0) {
    return SEED_SNAPSHOTS;
  }

  const userSnapshots = sortSnapshots(storedSnapshots).filter(
    (snapshot) => !isSeedSnapshot(snapshot),
  );
  const snapshotByDate = new Map(
    SEED_SNAPSHOTS.map((snapshot) => [snapshot.date, snapshot] as const),
  );

  for (const snapshot of userSnapshots) {
    snapshotByDate.set(snapshot.date, snapshot);
  }

  return sortSnapshots(Array.from(snapshotByDate.values()));
}

function buildYearSeedSnapshots(): TrendSnapshot[] {
  return Array.from({ length: YEAR_SEED_DAYS }, (_, dayIndex) => {
    const date = addDays(YEAR_SEED_START_DATE, dayIndex);
    const documents = seedDocumentsForDate(date);
    const topics = seedTopicsForDate(date, dayIndex, documents);

    return buildSnapshotFromResponse({
      date,
      documents,
      response: {
        requestId: `year-seed-${date}`,
        provider: "local",
        degraded: false,
        warnings: [],
        topics,
        documents: sampleDocumentTopics(topics, documents, date),
        usage: null,
      },
    });
  });
}

function seedDocumentsForDate(date: string): TopicRequestDocument[] {
  return [
    {
      id: "seed-signal-wire",
      source: "Signal wire",
      timestamp: `${date}T09:00:00.000Z`,
      text:
        "Generated seed signal summarizing public news, sports, technology, business, and civic water-cooler conversation for the selected day.",
    },
    {
      id: "seed-social-pulse",
      source: "Social pulse",
      timestamp: `${date}T11:00:00.000Z`,
      text:
        "Generated seed signal tracking creator clips, entertainment releases, travel planning, food culture, and lifestyle attention for the selected day.",
    },
    {
      id: "seed-travel-lens",
      source: "Travel lens",
      timestamp: `${date}T14:00:00.000Z`,
      text:
        "Generated seed signal translating current-event attention into hospitality, mobility, pricing, and local-market context for the selected day.",
    },
  ];
}

function seedTopicsForDate(
  date: string,
  dayIndex: number,
  documents: TopicRequestDocument[],
): CorpusTopic[] {
  const topics = new Map<string, { score: number; documentCount: number }>();

  for (const baseline of BASELINE_TOPICS) {
    addSeedTopic(
      topics,
      baseline.topicLabel,
      baselineScoreForTopic(baseline, date, dayIndex),
      baseline.documentCount,
    );
  }

  for (const anchor of EVENT_ANCHORS) {
    const score = eventPulseForDate(anchor, date);

    if (score > 0.045) {
      addSeedTopic(
        topics,
        anchor.topicLabel,
        score,
        anchor.documentCount ?? Math.min(3, Math.max(2, anchor.pillarIds.length)),
      );
    }
  }

  return Array.from(topics.entries())
    .map(([label, value]) => topic(label, value.score, value.documentCount, documents))
    .sort((left, right) => right.score - left.score);
}

function addSeedTopic(
  topics: Map<string, { score: number; documentCount: number }>,
  label: string,
  score: number,
  documentCount: number,
) {
  const existing = topics.get(label);

  topics.set(label, {
    score: round(clamp((existing?.score ?? 0) + score, 0.04, 0.98)),
    documentCount: Math.max(existing?.documentCount ?? 0, documentCount),
  });
}

function baselineScoreForTopic(topicValue: BaselineTopic, date: string, dayIndex: number) {
  const seasonal =
    Math.sin((dayIndex / YEAR_SEED_DAYS) * Math.PI * 2 + topicValue.phase) *
    topicValue.seasonalAmplitude;
  const noise = deterministicNoise(`${date}-${topicValue.topicLabel}`, 0.025);

  return clamp(topicValue.baseScore + seasonal + noise, 0.08, 0.58);
}

function eventPulseForDate(anchor: EventAnchor, date: string) {
  const distance = daysBetween(date, anchor.date);

  if (distance < -anchor.leadInDays || distance > anchor.decayDays) {
    return 0;
  }

  const window = distance < 0 ? anchor.leadInDays : anchor.decayDays;
  const progress = window === 0 ? 1 : 1 - Math.abs(distance) / window;
  const shapedProgress = Math.pow(Math.max(0, progress), distance < 0 ? 1.15 : 1.45);
  const noise = deterministicNoise(`${date}-${anchor.topicLabel}`, 0.018);

  return clamp(anchor.peakScore * shapedProgress + noise, 0, 0.98);
}

function isSeedSnapshot(snapshot: TrendSnapshot) {
  return (
    snapshot.requestId.startsWith("year-seed-") ||
    snapshot.id.startsWith("year-seed-") ||
    LEGACY_SEED_REQUEST_IDS.has(snapshot.requestId) ||
    LEGACY_SEED_REQUEST_IDS.has(snapshot.id)
  );
}

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
    const rawDominance = matches.reduce((sum, candidate) => sum + candidate.score, 0);

    return {
      id: pillar.id,
      label: pillar.label,
      shortLabel: pillar.shortLabel,
      color: pillar.color,
      rawDominance: round(rawDominance),
      dominanceSource: "topic_score" as const,
      score: 0,
      contributions: matches.map((candidate) =>
        buildContribution(candidate, response.documents, rawDominance),
      ),
    };
  });

  return normalizeSnapshot({
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
  });
}

export function sortSnapshots(snapshots: TrendSnapshot[]) {
  return snapshots
    .map((snapshot) => normalizeSnapshot(snapshot))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function getSnapshotLabel(date: string) {
  return formatDateLabel(date);
}

export function getCompactSnapshotLabel(date?: string, includeYear = false) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(dateToUtcDate(date));
}

export function getMonthTickLabel(date: string, includeYear = false) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(dateToUtcDate(date));
}

export function normalizeSnapshot(snapshot: TrendSnapshot): TrendSnapshot {
  const pillars = PILLARS.map((pillarDefinition) => {
    const existing = snapshot.pillars.find((pillar) => pillar.id === pillarDefinition.id);
    const contributions = existing?.contributions ?? [];
    const rawDominance =
      existing?.rawDominance ??
      contributions.reduce((sum, contribution) => sum + contribution.score, 0);

    return {
      id: pillarDefinition.id,
      label: pillarDefinition.label,
      shortLabel: pillarDefinition.shortLabel,
      color: pillarDefinition.color,
      rawDominance: round(rawDominance),
      dominanceSource: existing?.dominanceSource ?? ("topic_score" as const),
      score: 0,
      contributions,
    };
  });
  const maxDominance = Math.max(...pillars.map((pillar) => pillar.rawDominance), 0);

  return {
    ...snapshot,
    label: snapshot.label || formatDateLabel(snapshot.date),
    pillars: pillars.map((pillar) => ({
      ...pillar,
      score: round(maxDominance > 0 ? pillar.rawDominance / maxDominance : 0),
    })),
  };
}

export function scoreForPillar(snapshot: TrendSnapshot, pillarId: PillarId) {
  return snapshot.pillars.find((pillar) => pillar.id === pillarId)?.score ?? 0;
}

export function getOpportunityScore(pillar: PillarScore): OpportunityScore {
  const industryFit = HOSPITALITY_RELEVANCE[pillar.id];
  const scoreOutOf10 = clamp(pillar.score * industryFit * 10, 0, 10);
  const { tier, recommendation } = getOpportunityRecommendation(scoreOutOf10);

  return {
    companyName: COMPANY_PROFILE.name,
    industry: COMPANY_PROFILE.industry,
    scoreOutOf10,
    tier,
    recommendation,
    industryFit,
    waterCoolerDominance: pillar.score,
  };
}

export function getOpportunityRecommendation(
  scoreOutOf10: number,
): OpportunityRecommendation {
  const tier = recommendationTierForScore(scoreOutOf10);

  return {
    tier,
    recommendation: recommendationCopyForTier(tier),
  };
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

function sampleDocumentTopics(
  topics: CorpusTopic[],
  documents: TopicRequestDocument[],
  date?: string,
): DocumentTopics[] {
  return documents.map((document, documentIndex) => ({
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
        evidence: [sampleEvidence(topicValue.label, document.source ?? document.id, date)],
      })),
  }));
}

function sampleEvidence(label: string, source: string, date?: string) {
  const evidence =
    EVENT_ANCHORS.find((anchor) => anchor.topicLabel === label)?.evidence ??
    BASELINE_TOPICS.find((topicValue) => topicValue.topicLabel === label)?.evidence ??
    "generated seed signal for recurring public conversation";
  const datePrefix = date ? `${getCompactSnapshotLabel(date, true)} seed: ` : "";

  return `${datePrefix}${source} tracks ${label.toLowerCase()}; ${evidence}.`;
}

function topic(
  label: string,
  score: number,
  documentCount: number,
  documents = DEFAULT_OPTIONS.documents,
): CorpusTopic {
  const documentIds = documents
    .slice(0, Math.max(1, Math.min(documentCount, documents.length)))
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

function recommendationTierForScore(scoreOutOf10: number): RecommendationTier {
  if (scoreOutOf10 < 2.5) {
    return "Monitor";
  }

  if (scoreOutOf10 < 7) {
    return "Evaluate";
  }

  return "Activate";
}

function recommendationCopyForTier(tier: RecommendationTier) {
  if (tier === "Monitor") {
    return "Keep this on the radar; no immediate brand action needed.";
  }

  if (tier === "Evaluate") {
    return "Review for campaign, content, or operations fit before acting.";
  }

  return "Move quickly with a timely offer, content angle, or partnership.";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateToUtcDate(date));
}

function addDays(date: string, offset: number) {
  return new Date(dateToUtcMs(date) + offset * MS_PER_DAY).toISOString().slice(0, 10);
}

function daysBetween(leftDate: string, rightDate: string) {
  return Math.round((dateToUtcMs(leftDate) - dateToUtcMs(rightDate)) / MS_PER_DAY);
}

function dateToUtcDate(date: string) {
  return new Date(dateToUtcMs(date));
}

function dateToUtcMs(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function deterministicNoise(seed: string, amplitude: number) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const unit = (hash >>> 0) / 4_294_967_295;

  return (unit - 0.5) * 2 * amplitude;
}
