import {
  getRunningIssues,
  setSessionId,
  markCompleted,
  markFailed,
} from "@/lib/models/issues";
import { createSession, getSessionStatus } from "@/lib/devin";
import { commentOnIssue } from "@/lib/github";
import { logger } from "@/lib/logger";

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 60_000;

async function tick() {
  const issues = getRunningIssues();
  if (issues.length === 0) return;

  logger.info({ context: "worker", count: issues.length }, "Processing issues");

  for (const issue of issues) {
    if (!issue.devin_session_id) {
      try {
        const session = await createSession(issue.title, issue.body ?? "");
        setSessionId(issue.id, session.id);
        logger.info(
          { context: "worker", issueId: issue.id, sessionId: session.id },
          "Session started",
        );
      } catch (error) {
        logger.error(
          { context: "worker", issueId: issue.id, error: String(error) },
          "Failed to create session",
        );
      }
      continue;
    }

    try {
      const result = await getSessionStatus(issue.devin_session_id);

      if (result.failed) {
        markFailed(issue.id);
        logger.info({ context: "worker", issueId: issue.id }, "Issue failed");
      } else if (result.completed) {
        if (result.prUrl) {
          await commentOnIssue(
            issue.repo,
            issue.issue_number,
            `This issue has been implemented by Devin. PR: ${result.prUrl}`,
          );
        }
        markCompleted(issue.id, result.prUrl ?? "");
        logger.info(
          { context: "worker", issueId: issue.id, prUrl: result.prUrl },
          "Issue completed",
        );
      }
    } catch (error) {
      logger.error(
        {
          context: "worker",
          issueId: issue.id,
          sessionId: issue.devin_session_id,
          error: String(error),
        },
        "Failed to poll session",
      );
    }
  }
}

logger.info(
  { context: "worker", interval: POLL_INTERVAL_MS },
  "Worker started",
);

tick().catch((err) =>
  logger.error(
    { context: "worker", error: String(err) },
    "Initial tick failed",
  ),
);
setInterval(() => {
  tick().catch((err) =>
    logger.error({ context: "worker", error: String(err) }, "Tick failed"),
  );
}, POLL_INTERVAL_MS);
