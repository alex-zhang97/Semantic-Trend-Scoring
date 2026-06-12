import {
  extractTopics,
  getTopicApiMetadata,
  parseTopicRequest,
} from "@/lib/topic-extraction";

export async function GET() {
  return Response.json(getTopicApiMetadata());
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const authorizationError = validateAuthorization(request);

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

  const parsed = parseTopicRequest(body);

  if (!parsed.ok) {
    return Response.json(
      {
        requestId,
        error: parsed.error,
      },
      { status: 400 },
    );
  }

  const response = await extractTopics(parsed.value, requestId);

  return Response.json(response);
}

function validateAuthorization(request: Request) {
  const expectedToken = process.env.TOPIC_API_TOKEN;

  if (!expectedToken) {
    return null;
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${expectedToken}`) {
    return "Invalid or missing bearer token.";
  }

  return null;
}
