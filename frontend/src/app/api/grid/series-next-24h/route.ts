import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";
import { getAllSeriesNext24hQuery } from "@/lib/grid/queries";

function isoPlusHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = url.searchParams.get("start") || new Date().toISOString();
  const end = url.searchParams.get("end") || isoPlusHours(24);

  const result = await gridFetch({
    query: getAllSeriesNext24hQuery,
    variables: { start, end },
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
