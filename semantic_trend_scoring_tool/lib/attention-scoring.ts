export type MetricBaseline = {
  min: number;
  max: number;
};

export type MetricMeasurement = {
  value: number;
  baseline: MetricBaseline;
};

export type VolumeSignalName = "mentions" | "searches" | "views";

export type AttentionComponentName =
  | "volume"
  | "velocity"
  | "acceleration"
  | "diversity"
  | "persistence";

export type AttentionWeights = Record<AttentionComponentName, number>;

export type AttentionMetrics = Partial<Record<VolumeSignalName, MetricMeasurement>> & {
  velocity: MetricMeasurement;
  acceleration: MetricMeasurement;
  diversity: MetricMeasurement;
  persistence: MetricMeasurement;
};

export type AttentionRequestTopic = {
  topicId: string;
  metrics: AttentionMetrics;
};

export type ParsedAttentionRequest = {
  topics: AttentionRequestTopic[];
  options: {
    weights: AttentionWeights;
  };
};

export type AttentionComponents = Record<AttentionComponentName, number>;

export type AttentionVolumeSignals = Partial<Record<VolumeSignalName, number>>;

export type AttentionScore = {
  topicId: string;
  attentionScore: number;
  components: AttentionComponents;
  volumeSignals: AttentionVolumeSignals;
  weights: AttentionWeights;
};

export type AttentionScoringResponse = {
  requestId: string;
  scores: AttentionScore[];
};

type ValidationResult =
  | { ok: true; value: ParsedAttentionRequest }
  | { ok: false; error: string };

const MAX_TOPICS = 100;
const VOLUME_SIGNALS: VolumeSignalName[] = ["mentions", "searches", "views"];
const REQUIRED_METRICS = [
  "velocity",
  "acceleration",
  "diversity",
  "persistence",
] as const;

export const DEFAULT_ATTENTION_WEIGHTS: AttentionWeights = {
  volume: 0.4,
  velocity: 0.3,
  acceleration: 0.1,
  diversity: 0.1,
  persistence: 0.1,
};

export function parseAttentionRequest(body: unknown): ValidationResult {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!Array.isArray(body.topics)) {
    return { ok: false, error: "`topics` must be an array." };
  }

  if (body.topics.length < 1 || body.topics.length > MAX_TOPICS) {
    return {
      ok: false,
      error: "`topics` must contain between 1 and 100 items.",
    };
  }

  const topics: AttentionRequestTopic[] = [];

  for (let index = 0; index < body.topics.length; index += 1) {
    const parsedTopic = parseTopic(body.topics[index], index);

    if (!parsedTopic.ok) {
      return parsedTopic;
    }

    topics.push(parsedTopic.value);
  }

  const parsedWeights = parseWeights(body.options);

  if (!parsedWeights.ok) {
    return parsedWeights;
  }

  return {
    ok: true,
    value: {
      topics,
      options: {
        weights: parsedWeights.value,
      },
    },
  };
}

export function scoreAttention(
  request: ParsedAttentionRequest,
  requestId: string,
): AttentionScoringResponse {
  return {
    requestId,
    scores: request.topics.map((topic) => scoreTopic(topic, request.options.weights)),
  };
}

export function getAttentionApiMetadata() {
  return {
    name: "attention-scoring-api",
    methods: ["GET", "POST"],
    endpoint: "/api/attention",
    auth: {
      type: "optional_bearer",
      enabledWhen: "TOPIC_API_TOKEN is set",
    },
    limits: {
      maxTopics: MAX_TOPICS,
    },
    normalization: {
      formula: "clamp((value - baseline.min) / (baseline.max - baseline.min), 0, 1)",
      baselineRequirement: "Each metric baseline must include finite min and max values where max > min.",
    },
    defaultWeights: DEFAULT_ATTENTION_WEIGHTS,
    requiredMetrics: REQUIRED_METRICS,
    volumeSignals: VOLUME_SIGNALS,
  };
}

function parseTopic(value: unknown, index: number): ValidationResultTopic {
  if (!isObject(value)) {
    return {
      ok: false,
      error: `Topic at index ${index} must be an object.`,
    };
  }

  if (typeof value.topicId !== "string" || value.topicId.trim() === "") {
    return {
      ok: false,
      error: `Topic at index ${index} must include a non-empty string topicId.`,
    };
  }

  if (!isObject(value.metrics)) {
    return {
      ok: false,
      error: `Topic at index ${index} must include a metrics object.`,
    };
  }

  const volumeMetrics: Partial<Record<VolumeSignalName, MetricMeasurement>> = {};

  for (const signal of VOLUME_SIGNALS) {
    if (!hasOwn(value.metrics, signal)) {
      continue;
    }

    const parsedMetric = parseMeasurement(
      value.metrics[signal],
      `Topic at index ${index} metric ${signal}`,
    );

    if (!parsedMetric.ok) {
      return parsedMetric;
    }

    volumeMetrics[signal] = parsedMetric.value;
  }

  if (Object.keys(volumeMetrics).length === 0) {
    return {
      ok: false,
      error: `Topic at index ${index} must include at least one volume signal: mentions, searches, or views.`,
    };
  }

  const parsedVelocity = parseMeasurement(
    value.metrics.velocity,
    `Topic at index ${index} metric velocity`,
  );

  if (!parsedVelocity.ok) {
    return parsedVelocity;
  }

  const parsedAcceleration = parseMeasurement(
    value.metrics.acceleration,
    `Topic at index ${index} metric acceleration`,
  );

  if (!parsedAcceleration.ok) {
    return parsedAcceleration;
  }

  const parsedDiversity = parseMeasurement(
    value.metrics.diversity,
    `Topic at index ${index} metric diversity`,
  );

  if (!parsedDiversity.ok) {
    return parsedDiversity;
  }

  const parsedPersistence = parseMeasurement(
    value.metrics.persistence,
    `Topic at index ${index} metric persistence`,
  );

  if (!parsedPersistence.ok) {
    return parsedPersistence;
  }

  return {
    ok: true,
    value: {
      topicId: value.topicId.trim(),
      metrics: {
        ...volumeMetrics,
        velocity: parsedVelocity.value,
        acceleration: parsedAcceleration.value,
        diversity: parsedDiversity.value,
        persistence: parsedPersistence.value,
      },
    },
  };
}

type ValidationResultTopic =
  | { ok: true; value: AttentionRequestTopic }
  | { ok: false; error: string };

type ValidationResultMeasurement =
  | { ok: true; value: MetricMeasurement }
  | { ok: false; error: string };

type ValidationResultWeights =
  | { ok: true; value: AttentionWeights }
  | { ok: false; error: string };

function parseMeasurement(
  value: unknown,
  label: string,
): ValidationResultMeasurement {
  if (!isObject(value)) {
    return { ok: false, error: `${label} must be an object.` };
  }

  if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
    return { ok: false, error: `${label}.value must be a finite number.` };
  }

  if (!isObject(value.baseline)) {
    return { ok: false, error: `${label}.baseline must be an object.` };
  }

  const min = value.baseline.min;
  const max = value.baseline.max;

  if (typeof min !== "number" || !Number.isFinite(min)) {
    return { ok: false, error: `${label}.baseline.min must be a finite number.` };
  }

  if (typeof max !== "number" || !Number.isFinite(max)) {
    return { ok: false, error: `${label}.baseline.max must be a finite number.` };
  }

  if (max <= min) {
    return { ok: false, error: `${label}.baseline.max must be greater than baseline.min.` };
  }

  return {
    ok: true,
    value: {
      value: value.value,
      baseline: {
        min,
        max,
      },
    },
  };
}

function parseWeights(options: unknown): ValidationResultWeights {
  if (!isObject(options) || !hasOwn(options, "weights")) {
    return { ok: true, value: DEFAULT_ATTENTION_WEIGHTS };
  }

  if (!isObject(options.weights)) {
    return { ok: false, error: "`options.weights` must be an object." };
  }

  const weights = { ...DEFAULT_ATTENTION_WEIGHTS };

  for (const component of Object.keys(DEFAULT_ATTENTION_WEIGHTS) as AttentionComponentName[]) {
    if (!hasOwn(options.weights, component)) {
      continue;
    }

    const value = options.weights[component];

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return {
        ok: false,
        error: `\`options.weights.${component}\` must be a nonnegative finite number.`,
      };
    }

    weights[component] = value;
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return {
      ok: false,
      error: "`options.weights` must include at least one positive weight.",
    };
  }

  return {
    ok: true,
    value: normalizeWeights(weights, total),
  };
}

function scoreTopic(
  topic: AttentionRequestTopic,
  weights: AttentionWeights,
): AttentionScore {
  const volumeSignals: AttentionVolumeSignals = {};

  for (const signal of VOLUME_SIGNALS) {
    const metric = topic.metrics[signal];

    if (metric) {
      volumeSignals[signal] = normalizeMeasurement(metric);
    }
  }

  const volumeValues = Object.values(volumeSignals);
  const components: AttentionComponents = {
    volume: roundScore(
      volumeValues.reduce((sum, value) => sum + value, 0) / volumeValues.length,
    ),
    velocity: normalizeMeasurement(topic.metrics.velocity),
    acceleration: normalizeMeasurement(topic.metrics.acceleration),
    diversity: normalizeMeasurement(topic.metrics.diversity),
    persistence: normalizeMeasurement(topic.metrics.persistence),
  };
  const attentionScore = roundScore(
    components.volume * weights.volume +
      components.velocity * weights.velocity +
      components.acceleration * weights.acceleration +
      components.diversity * weights.diversity +
      components.persistence * weights.persistence,
  );

  return {
    topicId: topic.topicId,
    attentionScore,
    components,
    volumeSignals,
    weights,
  };
}

function normalizeWeights(weights: AttentionWeights, total: number): AttentionWeights {
  return {
    volume: roundScore(weights.volume / total),
    velocity: roundScore(weights.velocity / total),
    acceleration: roundScore(weights.acceleration / total),
    diversity: roundScore(weights.diversity / total),
    persistence: roundScore(weights.persistence / total),
  };
}

function normalizeMeasurement(metric: MetricMeasurement) {
  return roundScore(
    clamp(
      (metric.value - metric.baseline.min) /
        (metric.baseline.max - metric.baseline.min),
      0,
      1,
    ),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
