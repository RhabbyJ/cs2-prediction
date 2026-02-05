import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";
import { getPlayerQuery } from "@/lib/grid/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "1";

  const result = await gridFetch({
    query: getPlayerQuery,
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

  return NextResponse.json({ data: result.data, requestId: result.requestId });
}
