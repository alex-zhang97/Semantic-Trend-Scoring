export type TopicProvider = "openai" | "local";

export type TopicRequestDocument = {
  id: string;
  text: string;
  source?: string;
  timestamp?: string;
};

export type TopicRequestOptions = {
  maxTopicsPerDocument: number;
  maxCorpusTopics: number;
};

export type ParsedTopicRequest = {
  documents: TopicRequestDocument[];
  options: TopicRequestOptions;
};

export type Topic = {
  label: string;
  confidence: number;
  relevance: number;
  evidence: string[];
};

export type DocumentTopics = {
  id: string;
  topics: Topic[];
};

export type CorpusTopic = {
  label: string;
  score: number;
  documentCount: number;
  documentIds: string[];
};

export type TopicUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
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

type ValidationResult =
  | { ok: true; value: ParsedTopicRequest }
  | { ok: false; error: string };

type ExtractionPayload = {
  documents: DocumentTopics[];
  topics: CorpusTopic[];
};

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: unknown;
  usage?: unknown;
};

const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_MAX_TOPICS_PER_DOCUMENT = 5;
const DEFAULT_MAX_CORPUS_TOPICS = 10;
const MAX_DOCUMENTS = 25;
const MAX_TOTAL_CHARACTERS = 120_000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const STOPWORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

const ACRONYMS = new Set([
  "ai",
  "api",
  "ar",
  "b2b",
  "b2c",
  "ceo",
  "cfo",
  "cto",
  "ev",
  "gdp",
  "gpu",
  "hr",
  "ml",
  "nft",
  "seo",
  "uk",
  "us",
  "vr",
]);

export function parseTopicRequest(body: unknown): ValidationResult {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!Array.isArray(body.documents)) {
    return { ok: false, error: "`documents` must be an array." };
  }

  if (body.documents.length < 1 || body.documents.length > MAX_DOCUMENTS) {
    return {
      ok: false,
      error: "`documents` must contain between 1 and 25 items.",
    };
  }

  const documents: TopicRequestDocument[] = [];
  let totalCharacters = 0;

  for (let index = 0; index < body.documents.length; index += 1) {
    const candidate = body.documents[index];

    if (!isObject(candidate)) {
      return {
        ok: false,
        error: `Document at index ${index} must be an object.`,
      };
    }

    if (typeof candidate.text !== "string" || candidate.text.trim() === "") {
      return {
        ok: false,
        error: `Document at index ${index} must include non-empty string text.`,
      };
    }

    const text = candidate.text.trim();
    totalCharacters += text.length;

    const id =
      typeof candidate.id === "string" && candidate.id.trim() !== ""
        ? candidate.id.trim()
        : `doc-${index + 1}`;

    const source =
      typeof candidate.source === "string" && candidate.source.trim() !== ""
        ? candidate.source.trim()
        : undefined;

    const timestamp =
      typeof candidate.timestamp === "string" &&
      candidate.timestamp.trim() !== ""
        ? candidate.timestamp.trim()
        : undefined;

    if (timestamp !== undefined && Number.isNaN(Date.parse(timestamp))) {
      return {
        ok: false,
        error: `Document at index ${index} has an invalid timestamp.`,
      };
    }

    documents.push({ id, text, source, timestamp });
  }

  if (totalCharacters > MAX_TOTAL_CHARACTERS) {
    return {
      ok: false,
      error: "`documents` text must not exceed 120000 total characters.",
    };
  }

  const options = parseOptions(body.options);

  return {
    ok: true,
    value: {
      documents,
      options,
    },
  };
}

export async function extractTopics(
  request: ParsedTopicRequest,
  requestId: string,
): Promise<TopicExtractionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return localFallbackResponse(request, requestId, [
      "OPENAI_API_KEY is not configured; used local keyword fallback.",
    ]);
  }

  try {
    const model = process.env.OPENAI_TOPIC_MODEL || DEFAULT_MODEL;
    const openaiResult = await extractWithOpenAI(request, apiKey, model);

    return {
      requestId,
      provider: "openai",
      degraded: false,
      warnings: [],
      documents: openaiResult.payload.documents,
      topics: openaiResult.payload.topics,
      usage: openaiResult.usage,
    };
  } catch {
    return localFallbackResponse(request, requestId, [
      "OpenAI extraction failed; used local keyword fallback.",
    ]);
  }
}

export function getTopicApiMetadata() {
  return {
    name: "topic-extraction-api",
    methods: ["GET", "POST"],
    endpoint: "/api/topics",
    providers: ["openai", "local"] satisfies TopicProvider[],
    auth: {
      type: "optional_bearer",
      enabledWhen: "TOPIC_API_TOKEN is set",
    },
    limits: {
      maxDocuments: MAX_DOCUMENTS,
      maxTotalCharacters: MAX_TOTAL_CHARACTERS,
      defaultMaxTopicsPerDocument: DEFAULT_MAX_TOPICS_PER_DOCUMENT,
      defaultMaxCorpusTopics: DEFAULT_MAX_CORPUS_TOPICS,
    },
  };
}

function parseOptions(options: unknown): TopicRequestOptions {
  if (!isObject(options)) {
    return {
      maxTopicsPerDocument: DEFAULT_MAX_TOPICS_PER_DOCUMENT,
      maxCorpusTopics: DEFAULT_MAX_CORPUS_TOPICS,
    };
  }

  return {
    maxTopicsPerDocument: boundedInteger(
      options.maxTopicsPerDocument,
      DEFAULT_MAX_TOPICS_PER_DOCUMENT,
      1,
      10,
    ),
    maxCorpusTopics: boundedInteger(
      options.maxCorpusTopics,
      DEFAULT_MAX_CORPUS_TOPICS,
      1,
      25,
    ),
  };
}

async function extractWithOpenAI(
  request: ParsedTopicRequest,
  apiKey: string,
  model: string,
): Promise<{ payload: ExtractionPayload; usage: TopicUsage | null }> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "Extract concise, source-grounded semantic topics for trend scoring. Return only schema-valid JSON. Prefer stable topic labels over transient wording, and include short evidence phrases copied from the source text.",
      input: JSON.stringify({
        documents: request.documents,
        options: request.options,
      }),
      reasoning: {
        effort: "low",
      },
      text: {
        format: {
          type: "json_schema",
          name: "topic_extraction_result",
          strict: true,
          schema: buildStructuredOutputSchema(),
        },
      },
      store: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractOutputText(data);

  if (outputText === null) {
    throw new Error("OpenAI response did not include output text.");
  }

  const parsed = JSON.parse(outputText) as unknown;
  const payload = normalizeExtractionPayload(parsed, request);

  if (payload === null) {
    throw new Error("OpenAI response did not match the topic schema.");
  }

  return {
    payload,
    usage: normalizeUsage(data.usage),
  };
}

function localFallbackResponse(
  request: ParsedTopicRequest,
  requestId: string,
  warnings: string[],
): TopicExtractionResponse {
  const payload = extractWithLocalKeywords(request);

  return {
    requestId,
    provider: "local",
    degraded: true,
    warnings,
    documents: payload.documents,
    topics: payload.topics,
    usage: null,
  };
}

function extractWithLocalKeywords(request: ParsedTopicRequest): ExtractionPayload {
  const documents = request.documents.map((document) => ({
    id: document.id,
    topics: extractDocumentTopics(document, request.options.maxTopicsPerDocument),
  }));

  return {
    documents,
    topics: buildCorpusTopics(documents, request.options.maxCorpusTopics),
  };
}

function extractDocumentTopics(
  document: TopicRequestDocument,
  maxTopics: number,
): Topic[] {
  const tokens = tokenize(document.text);
  const candidates = new Map<
    string,
    {
      count: number;
      firstIndex: number;
      phraseLength: number;
      label: string;
    }
  >();

  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = 1; length <= 3; length += 1) {
      const phraseTokens = tokens.slice(start, start + length);

      if (phraseTokens.length !== length || !phraseTokens.every(isTopicToken)) {
        continue;
      }

      const key = phraseTokens.map((token) => token.normalized).join(" ");
      const existing = candidates.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        candidates.set(key, {
          count: 1,
          firstIndex: start,
          phraseLength: length,
          label: labelForPhrase(key),
        });
      }
    }
  }

  const scored = Array.from(candidates.entries())
    .map(([key, candidate]) => {
      const lengthWeight = 1 + (candidate.phraseLength - 1) * 0.55;
      const positionWeight =
        tokens.length === 0 ? 1 : 1 + 0.25 * (1 - candidate.firstIndex / tokens.length);
      const score = candidate.count * lengthWeight * positionWeight;

      return {
        key,
        score,
        ...candidate,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.phraseLength !== left.phraseLength) {
        return right.phraseLength - left.phraseLength;
      }

      return left.label.localeCompare(right.label);
    });

  const selected: typeof scored = [];

  for (const candidate of scored) {
    if (selected.length >= maxTopics) {
      break;
    }

    const overlaps = selected.some((selectedCandidate) =>
      phrasesOverlap(candidate.key, selectedCandidate.key),
    );

    if (!overlaps) {
      selected.push(candidate);
    }
  }

  const maxScore = Math.max(...selected.map((candidate) => candidate.score), 1);

  return selected.map((candidate) => {
    const normalizedScore = candidate.score / maxScore;

    return {
      label: candidate.label,
      confidence: roundScore(0.5 + normalizedScore * 0.45),
      relevance: roundScore(0.45 + normalizedScore * 0.5),
      evidence: evidenceForPhrase(document.text, candidate.key),
    };
  });
}

function buildCorpusTopics(
  documents: DocumentTopics[],
  maxTopics: number,
): CorpusTopic[] {
  const aggregate = new Map<
    string,
    {
      score: number;
      documentIds: Set<string>;
    }
  >();

  for (const document of documents) {
    for (const topic of document.topics) {
      const existing = aggregate.get(topic.label);

      if (existing) {
        existing.score += topic.relevance;
        existing.documentIds.add(document.id);
      } else {
        aggregate.set(topic.label, {
          score: topic.relevance,
          documentIds: new Set([document.id]),
        });
      }
    }
  }

  return Array.from(aggregate.entries())
    .map(([label, value]) => {
      const documentIds = Array.from(value.documentIds);
      const documentBoost = 1 + Math.log2(documentIds.length) * 0.15;

      return {
        label,
        score: roundScore(Math.min(1, (value.score / documents.length) * documentBoost)),
        documentCount: documentIds.length,
        documentIds,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.documentCount !== left.documentCount) {
        return right.documentCount - left.documentCount;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, maxTopics);
}

function normalizeExtractionPayload(
  value: unknown,
  request: ParsedTopicRequest,
): ExtractionPayload | null {
  if (!isObject(value) || !Array.isArray(value.documents) || !Array.isArray(value.topics)) {
    return null;
  }

  const expectedDocumentIds = new Set(request.documents.map((document) => document.id));
  const documents: DocumentTopics[] = [];

  for (const document of value.documents) {
    if (!isObject(document) || typeof document.id !== "string") {
      return null;
    }

    if (!expectedDocumentIds.has(document.id) || !Array.isArray(document.topics)) {
      return null;
    }

    const topics = normalizeTopics(
      document.topics,
      request.options.maxTopicsPerDocument,
    );

    if (topics === null) {
      return null;
    }

    documents.push({ id: document.id, topics });
  }

  if (documents.length !== request.documents.length) {
    return null;
  }

  const topics = normalizeCorpusTopics(value.topics, request.options.maxCorpusTopics);

  if (topics === null) {
    return null;
  }

  return { documents, topics };
}

function normalizeTopics(value: unknown[], limit: number): Topic[] | null {
  const topics: Topic[] = [];

  for (const candidate of value.slice(0, limit)) {
    if (
      !isObject(candidate) ||
      typeof candidate.label !== "string" ||
      candidate.label.trim() === "" ||
      !Array.isArray(candidate.evidence)
    ) {
      return null;
    }

    topics.push({
      label: candidate.label.trim(),
      confidence: clampScore(candidate.confidence),
      relevance: clampScore(candidate.relevance),
      evidence: candidate.evidence
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 3),
    });
  }

  return topics;
}

function normalizeCorpusTopics(value: unknown[], limit: number): CorpusTopic[] | null {
  const topics: CorpusTopic[] = [];

  for (const candidate of value.slice(0, limit)) {
    if (
      !isObject(candidate) ||
      typeof candidate.label !== "string" ||
      candidate.label.trim() === "" ||
      !Array.isArray(candidate.documentIds)
    ) {
      return null;
    }

    const documentIds = candidate.documentIds
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);

    topics.push({
      label: candidate.label.trim(),
      score: clampScore(candidate.score),
      documentCount:
        typeof candidate.documentCount === "number" &&
        Number.isFinite(candidate.documentCount)
          ? Math.max(0, Math.round(candidate.documentCount))
          : documentIds.length,
      documentIds,
    });
  }

  return topics;
}

function normalizeUsage(value: unknown): TopicUsage | null {
  if (!isObject(value)) {
    return null;
  }

  const inputTokens = numberFromUnknown(value.input_tokens);
  const outputTokens = numberFromUnknown(value.output_tokens);
  const totalTokens = numberFromUnknown(value.total_tokens);

  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens: totalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0),
  };
}

function extractOutputText(data: OpenAIResponsePayload): string | null {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  if (!Array.isArray(data.output)) {
    return null;
  }

  for (const outputItem of data.output) {
    if (!isObject(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const content of outputItem.content) {
      if (!isObject(content)) {
        continue;
      }

      if (typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function buildStructuredOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["documents", "topics"],
    properties: {
      documents: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "topics"],
          properties: {
            id: { type: "string" },
            topics: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["label", "confidence", "relevance", "evidence"],
                properties: {
                  label: { type: "string" },
                  confidence: { type: "number" },
                  relevance: { type: "number" },
                  evidence: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      topics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "score", "documentCount", "documentIds"],
          properties: {
            label: { type: "string" },
            score: { type: "number" },
            documentCount: { type: "number" },
            documentIds: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  };
}

function tokenize(text: string) {
  const matches = text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? [];

  return matches.map((raw) => ({
    raw,
    normalized: raw
      .toLowerCase()
      .replace(/^'+|'+$/g, "")
      .replace(/'s$/g, ""),
  }));
}

function isTopicToken(token: { normalized: string }) {
  return (
    token.normalized.length >= 2 &&
    !STOPWORDS.has(token.normalized) &&
    /[a-z0-9]/.test(token.normalized)
  );
}

function labelForPhrase(phrase: string) {
  return phrase
    .split(" ")
    .map((word) => {
      if (ACRONYMS.has(word)) {
        return word.toUpperCase();
      }

      if (word.endsWith("s") && ACRONYMS.has(word.slice(0, -1))) {
        return `${word.slice(0, -1).toUpperCase()}s`;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function phrasesOverlap(left: string, right: string) {
  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftWords = left.split(" ");
  const rightWords = right.split(" ");
  const sharedWords = leftWords.filter((word) => rightWords.includes(word));

  return sharedWords.length >= Math.min(leftWords.length, rightWords.length, 2);
}

function evidenceForPhrase(text: string, phrase: string) {
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const phraseWords = phrase.split(" ");
  const matchingSentence =
    sentences.find((sentence) => {
      const normalizedSentence = sentence.toLowerCase();
      return phraseWords.every((word) => normalizedSentence.includes(word));
    }) ?? text;

  return [compactSnippet(matchingSentence)];
}

function compactSnippet(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177).trimEnd()}...`;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return roundScore(Math.min(1, Math.max(0, value)));
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

function numberFromUnknown(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
