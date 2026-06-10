export const INGEST_SOURCE_IDS = [
  "google-trends",
  "reddit",
  "gdelt",
  "news",
  "wikipedia",
] as const;

export type IngestSourceId = (typeof INGEST_SOURCE_IDS)[number];

export type RawSignalRecord = {
  source: IngestSourceId;
  timestamp: string;
  ingestedAt: string;
  title: string;
  content?: string;
  engagement?: number;
  url?: string;
  metadata?: Record<string, string | number | boolean | null>;
  raw: unknown;
};

export type SourceConfigStatus = {
  id: IngestSourceId;
  label: string;
  enabled: boolean;
  ready: boolean;
  requiresApiKey: boolean;
  requiredEnv: string[];
  optionalEnv: string[];
  missingEnv: string[];
  notes?: string;
};

export type SourceRunStatus = "fulfilled" | "skipped" | "failed";

export type SourceRunResult = {
  source: IngestSourceId;
  status: SourceRunStatus;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  recordCount: number;
  records: RawSignalRecord[];
  error?: string;
  skippedReason?: string;
};

export type IngestRun = {
  runId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  requestedSources: IngestSourceId[];
  limit: number;
  totalRecords: number;
  results: SourceRunResult[];
  records: RawSignalRecord[];
};

export type IngestRunSummary = Omit<IngestRun, "records" | "results"> & {
  results: Array<Omit<SourceRunResult, "records">>;
};
