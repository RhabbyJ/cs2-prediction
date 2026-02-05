import { NextResponse } from "next/server";
import { gridFetch } from "@/lib/grid/client";
import { getSeriesFormatsQuery } from "@/lib/grid/queries";

export async function GET() {
  const result = await gridFetch({ query: getSeriesFormatsQuery });

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
