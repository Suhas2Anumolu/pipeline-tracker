import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class StaleSessionError extends Error {
  constructor() {
    super("Your session refers to a user that no longer exists. Please sign out and sign back in.");
    this.name = "StaleSessionError";
  }
}

/**
 * Returns the current user's id, guaranteed to exist in the database.
 *
 * Why this exists: sessions here use the JWT strategy (required because
 * NextAuth's Credentials provider doesn't support database sessions). A JWT
 * is a signed cookie that is NOT re-checked against the DB by default, so if
 * the database is ever reset/reseeded (fresh `prisma migrate reset`,
 * re-running the seed script, switching DBs, etc.) while a browser still
 * holds an old session cookie, that cookie's user id can point at a row that
 * no longer exists. Any `prisma.job.create()` for that id then fails with a
 * raw foreign-key constraint error.
 *
 * This helper catches that case up front and throws a clear, catchable error
 * instead, so routes can return "please sign in again" rather than a 500
 * with a Prisma stack trace.
 */
export async function requireCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new StaleSessionError();
  }

  const exists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!exists) {
    throw new StaleSessionError();
  }

  return session.user.id;
}
