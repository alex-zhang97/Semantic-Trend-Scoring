export function validateBearerAuthorization(request: Request) {
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
