import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";
import { getTeamQuery } from "@/lib/grid/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "1";

  const result = await gridFetch({
    query: getTeamQuery,
    variables: { id },
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

  return NextResponse.json({ ...result.data, requestId: result.requestId });
}
