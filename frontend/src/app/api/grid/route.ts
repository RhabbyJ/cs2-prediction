import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";

type GridProxyBody = {
  query?: string;
  variables?: Record<string, unknown>;
};

function normalizeOpenAccessQuery(query: string) {
  // Open Access schema does not expose Organization.nameShortened.
  return query.replace(/\bnameShortened\b/g, (match, offset, input) => {
    const lookback = input.slice(Math.max(0, offset - 80), offset);
    if (lookback.includes("organization")) {
      return "";
    }
    return match;
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as GridProxyBody;

  if (!body?.query) {
    return NextResponse.json(
      { error: "Missing GraphQL query" },
      { status: 400 }
    );
  }

  const normalizedQuery = normalizeOpenAccessQuery(body.query);
  const result = await gridFetch({
    query: normalizedQuery,
    variables: body.variables,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        details: result.details,
        status: result.status,
        requestId: result.requestId,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: result.data, requestId: result.requestId });
}
