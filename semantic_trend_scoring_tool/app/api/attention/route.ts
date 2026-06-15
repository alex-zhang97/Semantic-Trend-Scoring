import {
  getAttentionApiMetadata,
  parseAttentionRequest,
  scoreAttention,
} from "@/lib/attention-scoring";
import { validateBearerAuthorization } from "@/lib/api-auth";

export async function GET() {
  return Response.json(getAttentionApiMetadata());
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const authorizationError = validateBearerAuthorization(request);

  if (authorizationError !== null) {
    return Response.json(
      {
        requestId,
        error: authorizationError,
      },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        requestId,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = parseAttentionRequest(body);

  if (!parsed.ok) {
    return Response.json(
      {
        requestId,
        error: parsed.error,
      },
      { status: 400 },
    );
  }

  return Response.json(scoreAttention(parsed.value, requestId));
}
