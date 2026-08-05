import "server-only";

export function getVercelAccessToken(): string | null {
  return process.env.VERCEL_ACCESS_TOKEN?.trim() || null;
}
