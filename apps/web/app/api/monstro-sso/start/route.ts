import { NextResponse } from "next/server";

function safeCallbackURL(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function GET(request: Request) {
  const adminURL = process.env.MONSTRO_AUTH_URL;
  if (!adminURL) {
    return NextResponse.json(
      { error: "Monstro Admin sign-in is not configured" },
      { status: 503 },
    );
  }

  const requestURL = new URL(request.url);
  const launchURL = new URL("/api/protected/agent-session", adminURL);
  launchURL.searchParams.set(
    "callbackURL",
    safeCallbackURL(requestURL.searchParams.get("callbackURL")),
  );
  return NextResponse.redirect(launchURL);
}
