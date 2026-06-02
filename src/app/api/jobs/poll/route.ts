import { getRunningIssues, markCompleted } from "@/lib/models/issues";
import { getSessionStatus } from "@/lib/devin";
import { commentOnIssue } from "@/lib/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const issues = getRunningIssues();

  for (const issue of issues) {
    if (!issue.devin_session_id) continue;

    try {
      const result = await getSessionStatus(issue.devin_session_id);

      if (result.completed && result.prUrl) {
        await commentOnIssue(
          issue.repo,
          issue.issue_number,
          `This issue has been implemented by Devin. PR: ${result.prUrl}`,
        );

        markCompleted(issue.id, result.prUrl);
      }
    } catch (error) {
      console.error(`Failed to poll session ${issue.devin_session_id}:`, error);
    }
  }

  return Response.json({ ok: true, polled: issues.length });
}
