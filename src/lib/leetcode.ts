// LeetCode has no official public API. This reads leetcode.com/graphql,
// the same unauthenticated, read-only endpoint their own site uses to
// render public profile pages — no login, no write access, just public
// data one query away from what you'd see visiting the profile yourself.
//
// Because it's undocumented, it could change shape or start rate-limiting
// without notice. Two deliberate safeguards:
//  - Callers (src/app/api/leetcode/*) cache the result in LeetCodeStats and
//    only refetch at most every REFRESH_COOLDOWN_MS, not on every request.
//  - Every failure mode has a specific, catchable error so the UI can show
//    "username not found" vs. "LeetCode's API didn't respond" distinctly,
//    rather than one opaque failure.

export class LeetCodeUserNotFoundError extends Error {
  constructor(username: string) {
    super(`No LeetCode user found with username "${username}".`);
  }
}
export class LeetCodeFetchError extends Error {}

export const REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

export type LeetCodeStatsResult = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  ranking: number | null;
  contestRating: number | null;
  attendedContests: number | null;
  currentStreak: number;
};

const QUERY = `
  query getUserProfile($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } }
      submissionCalendar
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
    }
  }
`;

function computeCurrentStreak(submissionCalendarJson: string): number {
  let calendar: Record<string, number>;
  try {
    calendar = JSON.parse(submissionCalendarJson);
  } catch {
    return 0;
  }

  const DAY = 86400;
  const todayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
  // If nothing logged yet today, the streak isn't broken until the day
  // ends — start counting from yesterday instead of failing immediately.
  let day = calendar[todayStart] ? todayStart : todayStart - DAY;

  let streak = 0;
  while (calendar[day]) {
    streak += 1;
    day -= DAY;
  }
  return streak;
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStatsResult> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LeetCode's endpoint expects requests to look like they came from
      // the site itself; omitting these headers is a common cause of
      // unexplained failures against this particular endpoint.
      Referer: "https://leetcode.com",
      "User-Agent": "Mozilla/5.0 (compatible; PipelineTracker/1.0)",
    },
    body: JSON.stringify({ query: QUERY, variables: { username } }),
  });

  if (!res.ok) {
    throw new LeetCodeFetchError(`LeetCode's API returned ${res.status}. It may be rate-limiting or the endpoint has changed.`);
  }

  const data = await res.json();
  if (!data?.data?.matchedUser) {
    throw new LeetCodeUserNotFoundError(username);
  }

  const acNums: { difficulty: string; count: number }[] = data.data.matchedUser.submitStats?.acSubmissionNum ?? [];
  const totalNums: { difficulty: string; count: number }[] = data.data.allQuestionsCount ?? [];
  const findCount = (arr: { difficulty: string; count: number }[], difficulty: string) =>
    arr.find((x) => x.difficulty === difficulty)?.count ?? 0;

  const contestRanking = data.data.userContestRanking;

  return {
    username: data.data.matchedUser.username,
    totalSolved: findCount(acNums, "All"),
    easySolved: findCount(acNums, "Easy"),
    mediumSolved: findCount(acNums, "Medium"),
    hardSolved: findCount(acNums, "Hard"),
    totalEasy: findCount(totalNums, "Easy"),
    totalMedium: findCount(totalNums, "Medium"),
    totalHard: findCount(totalNums, "Hard"),
    ranking: data.data.matchedUser.profile?.ranking ?? null,
    contestRating: contestRanking?.rating ?? null,
    attendedContests: contestRanking?.attendedContestsCount ?? null,
    currentStreak: computeCurrentStreak(data.data.matchedUser.submissionCalendar ?? "{}"),
  };
}
