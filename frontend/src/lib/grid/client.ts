const DEFAULT_ENDPOINT = "https://api-op.grid.gg/central-data/graphql";

export type GridRequest = {
  query: string;
  variables?: Record<string, unknown>;
};

export type GridResponse<T> = {
  data?: T;
  errors?: unknown;
};

export async function gridFetch<T>(request: GridRequest) {
  const apiKey = process.env.GRID_API_KEY;
  const endpoint = process.env.GRID_CENTRAL_DATA_URL || DEFAULT_ENDPOINT;
  const requestId = crypto.randomUUID();

  if (!apiKey) {
    console.error(`[grid][${requestId}] Missing GRID_API_KEY`);
    return {
      ok: false,
      status: 500,
      requestId,
      error: "Missing GRID_API_KEY",
    };
  }

  let response: Response;
  let rawText = "";
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-grid-api-key": apiKey,
        "x-api-key": apiKey,
      },
      body: JSON.stringify(request),
      cache: "no-store",
    });

    rawText = await response.text();
  } catch (err: any) {
    console.error(`[grid][${requestId}] Fetch failed`, err?.message || err);
    return {
      ok: false,
      status: 502,
      requestId,
      error: "GRID fetch failed",
    };
  }

  let payload: GridResponse<T> | string | null = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok || (payload as GridResponse<T>)?.errors) {
    console.error(
      `[grid][${requestId}] GRID API error`,
      JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          apiKeyPresent: Boolean(apiKey),
          apiKeyLength: apiKey?.length || 0,
          response: payload,
        },
        null,
        2
      )
    );
    return {
      ok: false,
      status: response.status,
      requestId,
      error: "GRID API error",
      details: (payload as GridResponse<T>)?.errors || payload,
    };
  }

  return {
    ok: true,
    status: response.status,
    requestId,
    data: (payload as GridResponse<T>)?.data ?? payload,
  };
}
