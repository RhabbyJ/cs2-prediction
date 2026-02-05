import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT = "https://api-op.grid.gg/central-data/graphql";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "1";

  const apiKey = process.env.GRID_API_KEY;
  const endpoint = process.env.GRID_CENTRAL_DATA_URL || DEFAULT_ENDPOINT;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GRID_API_KEY" },
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

  const response = await fetch(endpoint, {
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

  const data = await response.json();

  if (!response.ok || data.errors) {
    return NextResponse.json(
      { error: "GRID API error", details: data.errors || data },
      { status: 502 }
    );
  }

  return NextResponse.json(data.data);
}
