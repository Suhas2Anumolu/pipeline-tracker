import { randomBytes, createHash } from "crypto";

const TOKEN_PREFIX = "pl_";

export function generateApiToken(): string {
  return TOKEN_PREFIX + randomBytes(24).toString("base64url");
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Shown in the UI/extension so a revoked-looking token in a screenshot
// doesn't leak anything useful — same idea as GitHub's token display.
export function maskApiToken(token: string): string {
  return `${token.slice(0, 6)}${"•".repeat(6)}${token.slice(-4)}`;
}
