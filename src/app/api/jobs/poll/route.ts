import { getAllIssues } from "@/lib/models/issues";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues = getAllIssues();
  return Response.json({ issues });
}
