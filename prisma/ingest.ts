import { PrismaClient } from "@prisma/client";
import { runIngest } from "../src/lib/ingestPostings";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching postings from Greenhouse, Lever, and the GitHub internship list…");
  const result = await runIngest(prisma);
  for (const warning of result.warnings) console.warn(warning);
  console.log(
    `Done. ${result.fetched} fetched, ${result.created} new, ${result.updated} refreshed, ${result.markedInactive} marked inactive.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
