import {
  getIngestionConfig,
  getSourceConfigStatuses,
  isIngestSourceId,
} from "@/lib/ingestion/config";
import { runIngestion } from "@/lib/ingestion/ingest";
import { getRecentIngestRuns, summarizeIngestRun } from "@/lib/ingestion/store";
import type { IngestSourceId } from "@/lib/ingestion/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IngestRequestBody = {
  sources?: string[] | string;
  limit?: number;
};

export async function GET() {
  const config = getIngestionConfig();

  return Response.json({
    ok: true,
    endpoint: "/api/ingest",
    methods: {
      GET: "Returns source readiness and recent in-memory ingest runs.",
      POST: "Runs ingestion across configured sources and returns raw signal records.",
    },
    defaults: {
      limit: config.defaultLimit,
      requestTimeoutMs: config.requestTimeoutMs,
    },
    sources: getSourceConfigStatuses(config),
    recentRuns: getRecentIngestRuns(),
  });
}

export async function POST(request: Request) {
  const body = await readRequestBody(request);
  const requestedSources = normalizeSources(body.sources);
  const invalidSources = requestedSources.filter(
    (source) => !isIngestSourceId(source),
  );

  if (invalidSources.length > 0) {
    return Response.json(
      {
        ok: false,
        error: "Unknown ingest source requested.",
        invalidSources,
      },
      { status: 400 },
    );
  }

  const run = await runIngestion({
    sources: requestedSources as IngestSourceId[],
    limit: body.limit,
  });

  return Response.json({
    ok: true,
    run: summarizeIngestRun(run),
    records: run.records,
  });
}

async function readRequestBody(request: Request): Promise<IngestRequestBody> {
  if (!request.body) {
    return {};
  }

  try {
    const payload = (await request.json()) as unknown;

    if (!isRecord(payload)) {
      return {};
    }

    return {
      sources: Array.isArray(payload.sources)
        ? payload.sources.filter((source): source is string => typeof source === "string")
        : typeof payload.sources === "string"
          ? payload.sources
          : undefined,
      limit: typeof payload.limit === "number" ? payload.limit : undefined,
    };
  } catch {
    return {};
  }
}

function normalizeSources(sources: string[] | string | undefined): string[] {
  if (!sources) {
    return [];
  }

  if (Array.isArray(sources)) {
    return sources;
  }

  return sources
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
