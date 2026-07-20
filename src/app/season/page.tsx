import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SeasonDashboard from "@/components/SeasonDashboard";

export default async function SeasonPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return <SeasonDashboard />;
}
