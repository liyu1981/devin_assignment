import { getRunningIssues, markCompleted } from "@/lib/models/issues";
import { getSessionStatus } from "@/lib/devin";
import { commentOnIssue } from "@/lib/github";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const issues = getRunningIssues();
  logger.info(
    { context: "poller", count: issues.length },
    "Polling running issues",
  );

  let completed = 0;

  for (const issue of issues) {
    if (!issue.devin_session_id) continue;

    try {
      const result = await getSessionStatus(issue.devin_session_id);

      if (result.completed && result.prUrl) {
        logger.info(
          { context: "poller", issueId: issue.id, prUrl: result.prUrl },
          "Issue completed by Devin",
        );

        await commentOnIssue(
          issue.repo,
          issue.issue_number,
          `This issue has been implemented by Devin. PR: ${result.prUrl}`,
        );

        markCompleted(issue.id, result.prUrl);
        completed++;
      }
    } catch (error) {
      logger.error(
        {
          context: "poller",
          issueId: issue.id,
          sessionId: issue.devin_session_id,
          error: String(error),
        },
        "Failed to poll session",
      );
    }
  }

  logger.info(
    { context: "poller", total: issues.length, completed },
    "Poll complete",
  );
  return Response.json({ ok: true, polled: issues.length, completed });
}
