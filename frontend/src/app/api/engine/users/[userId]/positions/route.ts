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

type Params = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await params;
  try {
    const response = await fetch(`${getEngineBaseUrl()}/users/${userId}/positions`, {
      cache: "no-store",
    });
    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!response.ok) {
      return NextResponse.json({ error: "Engine positions request failed", details: body }, { status: response.status });
    }

    return NextResponse.json(body);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to reach engine", details: err instanceof Error ? err.message : "unknown error" },
      { status: 502 }
    );
  }
}
