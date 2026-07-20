import { prisma } from "@/lib/prisma";
import { hashApiToken } from "@/lib/apiToken";

export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid or revoked API token.");
  }
}

export async function requireUserIdFromBearer(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new InvalidTokenError();

  const tokenHash = hashApiToken(match[1].trim());
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!apiToken) throw new InvalidTokenError();

  // Best-effort; don't block the request if this write fails.
  prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return apiToken.userId;
}

// Every extension-facing route needs these on both the real response and the
// OPTIONS preflight — the extension calls cross-origin with a bearer token
// instead of cookies, so CORS (not SameSite cookie rules) governs access.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
