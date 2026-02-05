import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";

type GridProxyBody = {
  query?: string;
  variables?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as GridProxyBody;

  if (!body?.query) {
    return NextResponse.json(
      { error: "Missing GraphQL query" },
      { status: 400 }
    );
  }

  const result = await gridFetch({ query: body.query, variables: body.variables });

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
