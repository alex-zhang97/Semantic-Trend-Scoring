import type { IngestRun, IngestRunSummary, SourceRunResult } from "./types";

const MAX_RUNS_TO_KEEP = 10;
const recentRuns: IngestRun[] = [];

export function rememberIngestRun(run: IngestRun): void {
  recentRuns.unshift(run);

  if (recentRuns.length > MAX_RUNS_TO_KEEP) {
    recentRuns.splice(MAX_RUNS_TO_KEEP);
  }
}

export function getRecentIngestRuns(): IngestRunSummary[] {
  return recentRuns.map(summarizeIngestRun);
}

export function summarizeIngestRun(run: IngestRun): IngestRunSummary {
  return {
    runId: run.runId,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs: run.durationMs,
    requestedSources: run.requestedSources,
    limit: run.limit,
    totalRecords: run.totalRecords,
    results: run.results.map(stripRecordsFromResult),
  };
}

function stripRecordsFromResult(
  result: SourceRunResult,
): Omit<SourceRunResult, "records"> {
  return {
    source: result.source,
    status: result.status,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    durationMs: result.durationMs,
    recordCount: result.recordCount,
    error: result.error,
    skippedReason: result.skippedReason,
  };
}
