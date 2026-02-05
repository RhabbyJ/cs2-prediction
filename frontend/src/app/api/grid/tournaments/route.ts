import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT = "https://api-op.grid.gg/central-data/graphql";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "1";

  const apiKey = process.env.GRID_API_KEY;
  const endpoint = process.env.GRID_CENTRAL_DATA_URL || DEFAULT_ENDPOINT;
  const requestId = crypto.randomUUID();

  if (!apiKey) {
    console.error(`[grid][${requestId}] Missing GRID_API_KEY`);
    return NextResponse.json(
      { error: "Missing GRID_API_KEY", requestId },
      { status: 500 }
    );
  }

  const query = `
    query GetTournament($id: ID!) {
      tournament(id: $id) {
        id
        name
        nameShortened
      }
    }
  `;

  let response: Response;
  let rawText = "";
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-grid-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        variables: { id },
      }),
      cache: "no-store",
    });

    rawText = await response.text();
  } catch (err: any) {
    console.error(`[grid][${requestId}] Fetch failed`, err?.message || err);
    return NextResponse.json(
      { error: "GRID fetch failed", requestId },
      { status: 502 }
    );
  }

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok || data.errors) {
    console.error(
      `[grid][${requestId}] GRID API error`,
      JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          response: data,
        },
        null,
        2
      )
    );
    return NextResponse.json(
      {
        error: "GRID API error",
        details: data?.errors || data,
        status: response.status,
        requestId,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ...data.data, requestId });
}
