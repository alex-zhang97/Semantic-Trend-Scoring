import { randomUUID } from "node:crypto";
import {
  getIngestionConfig,
  getSourceConfigStatuses,
  type IngestionConfig,
} from "./config";
import { SOURCE_FETCHERS } from "./sources";
import { rememberIngestRun } from "./store";
import {
  INGEST_SOURCE_IDS,
  type IngestRun,
  type IngestSourceId,
  type SourceRunResult,
} from "./types";

export type RunIngestionOptions = {
  sources?: IngestSourceId[];
  limit?: number;
};

export async function runIngestion(
  options: RunIngestionOptions = {},
): Promise<IngestRun> {
  const config = getIngestionConfig();
  const requestedSources = options.sources?.length
    ? options.sources
    : [...INGEST_SOURCE_IDS];
  const limit = clampLimit(options.limit ?? config.defaultLimit);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const results = await Promise.all(
    requestedSources.map((source) => runSource(source, config, startedAt, limit)),
  );
  const records = results.flatMap((result) => result.records);
  const endedAtMs = Date.now();
  const run: IngestRun = {
    runId: randomUUID(),
    startedAt,
    endedAt: new Date(endedAtMs).toISOString(),
    durationMs: endedAtMs - startedAtMs,
    requestedSources,
    limit,
    totalRecords: records.length,
    results,
    records,
  };

  rememberIngestRun(run);

  return run;
}

async function runSource(
  source: IngestSourceId,
  config: IngestionConfig,
  ingestedAt: string,
  limit: number,
): Promise<SourceRunResult> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const sourceStatus = getSourceConfigStatuses(config).find(
    (status) => status.id === source,
  );

  if (!sourceStatus?.ready) {
    return buildSourceResult({
      source,
      status: "skipped",
      startedAtMs,
      startedAt,
      records: [],
      skippedReason: sourceStatus?.missingEnv.length
        ? `Missing environment variables: ${sourceStatus.missingEnv.join(", ")}`
        : "Source is not configured.",
    });
  }

  try {
    const records = await SOURCE_FETCHERS[source](config, { ingestedAt, limit });

    return buildSourceResult({
      source,
      status: "fulfilled",
      startedAtMs,
      startedAt,
      records,
    });
  } catch (error) {
    return buildSourceResult({
      source,
      status: "failed",
      startedAtMs,
      startedAt,
      records: [],
      error: error instanceof Error ? error.message : "Unknown ingestion error.",
    });
  }
}

function buildSourceResult(
  input: Pick<
    SourceRunResult,
    "source" | "status" | "startedAt" | "records" | "error" | "skippedReason"
  > & { startedAtMs: number },
): SourceRunResult {
  const endedAtMs = Date.now();

  return {
    source: input.source,
    status: input.status,
    startedAt: input.startedAt,
    endedAt: new Date(endedAtMs).toISOString(),
    durationMs: endedAtMs - input.startedAtMs,
    recordCount: input.records.length,
    records: input.records,
    error: input.error,
    skippedReason: input.skippedReason,
  };
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 25;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 100);
}
