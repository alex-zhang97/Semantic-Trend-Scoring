type FetchBody = BodyInit | null | undefined;

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: FetchBody;
};

export async function fetchJson<T>(
  url: string,
  options: FetchOptions,
  timeoutMs: number,
): Promise<T> {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  const payload = (await response.json()) as T;

  return payload;
}

export async function fetchText(
  url: string,
  options: FetchOptions,
  timeoutMs: number,
): Promise<string> {
  const response = await fetchWithTimeout(url, options, timeoutMs);

  return response.text();
}

export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}
