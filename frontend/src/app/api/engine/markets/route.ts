import { NextResponse } from "next/server";

const DEFAULT_ENGINE_HTTP_URL = "http://localhost:8080";

function getEngineBaseUrl() {
  const fromPrivate = process.env.ENGINE_HTTP_URL;
  const fromPublic = process.env.NEXT_PUBLIC_ENGINE_HTTP_URL;
  const fromWs = process.env.NEXT_PUBLIC_ENGINE_URL
    ?.replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:")
    .replace(/\/ws$/, "");

  return fromPrivate || fromPublic || fromWs || DEFAULT_ENGINE_HTTP_URL;
}

export async function GET() {
  try {
    const response = await fetch(`${getEngineBaseUrl()}/markets`, {
      cache: "no-store",
    });

    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!response.ok) {
      return NextResponse.json(
        { error: "Engine markets request failed", details: body },
        { status: response.status }
      );
    }

    return NextResponse.json(body);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to reach engine", details: err instanceof Error ? err.message : "unknown error" },
      { status: 502 }
    );
  }
}
