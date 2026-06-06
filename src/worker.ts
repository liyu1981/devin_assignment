import "dotenv/config";
import os from "node:os";
import { createSession, getSessionStatus } from "@/lib/devin";
import { commentOnIssue } from "@/lib/github";
import { logger } from "@/lib/logger";
import {
  appendLog,
  claimPendingIssue,
  getRunningIssues,
  markCompleted,
  markFailed,
  markWaitingForUser,
  updatePrUrl,
  setSessionId,
} from "@/lib/models/issues";

const WORKER_ID = `${os.hostname()}:${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5_000;

async function tick() {
  // Phase 1: atomically claim and start sessions for pending issues
  while (true) {
    const issue = claimPendingIssue(WORKER_ID);
    if (!issue) break;

    try {
      const prompt = `Repository: ${issue.repo}

GitHub Issue #${issue.issue_number}

Title:
${issue.title}

Requirements:
${issue.body ?? ""}

Note: Do not wait for CI to finish before reporting completion. Report done as soon as the PR is created.`;

      appendLog(issue.id, "Create Session Request", "send", { prompt });
      const session = await createSession(
        issue.repo,
        issue.issue_number,
        issue.title,
        issue.body ?? "",
      );
      appendLog(issue.id, "Create Session Response", "receive", {
        session_id: session.id,
        url: session.url,
      });
      setSessionId(issue.id, session.id);
      logger.info(
        {
          context: "worker",
          worker: WORKER_ID,
          issueId: issue.id,
          sessionId: session.id,
        },
        "Session started",
      );
    } catch (error) {
      logger.error(
        {
          context: "worker",
          worker: WORKER_ID,
          issueId: issue.id,
          error: String(error),
        },
        "Failed to create session",
      );
    }
  }

  // Phase 2: poll status for already-running issues claimed by this worker
  const running = getRunningIssues(WORKER_ID);

  for (const issue of running) {
    if (!issue.devin_session_id) continue;

    try {
      const { status: result, raw } = await getSessionStatus(
        issue.devin_session_id,
      );
      appendLog(issue.id, "Status Poll Response", "receive", raw);

      if (raw.status_detail === "waiting_for_user") {
        const prUrl = raw.pull_requests?.[0]?.pr_url ?? undefined;
        markWaitingForUser(issue.id, prUrl);
        logger.info(
          { context: "worker", worker: WORKER_ID, issueId: issue.id },
          "Session waiting for user input",
        );
        continue;
      }

      if (raw.pull_requests?.[0]?.pr_url && !issue.pr_url) {
        updatePrUrl(issue.id, raw.pull_requests[0].pr_url);
      }

      if (result.failed) {
        markFailed(issue.id);
        logger.info(
          { context: "worker", worker: WORKER_ID, issueId: issue.id },
          "Issue failed",
        );
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
          {
            context: "worker",
            worker: WORKER_ID,
            issueId: issue.id,
            prUrl: result.prUrl,
          },
          "Issue completed",
        );
      }
    } catch (error) {
      logger.error(
        {
          context: "worker",
          worker: WORKER_ID,
          issueId: issue.id,
          sessionId: issue.devin_session_id,
          error: String(error),
        },
        "Failed to poll session",
      );
    }
  }
}

const devinOrgId = process.env.DEVIN_ORG_ID;
const devinMock = process.env.DEVIN_MOCK === "true";

if (!devinOrgId) {
  logger.warn(
    { context: "worker", worker: WORKER_ID },
    "DEVIN_ORG_ID is not set — createSession will fail. Set it to your Devin org ID.",
  );
}

if (devinMock) {
  logger.info(
    { context: "worker", worker: WORKER_ID },
    "Using mock Devin server",
  );
}

logger.info(
  {
    context: "worker",
    worker: WORKER_ID,
    interval: POLL_INTERVAL_MS,
    devinOrgId: devinOrgId || "(not set)",
    mockMode: devinMock,
  },
  "Worker started",
);

tick().catch((err) =>
  logger.error(
    { context: "worker", worker: WORKER_ID, error: String(err) },
    "Initial tick failed",
  ),
);
setInterval(() => {
  tick().catch((err) =>
    logger.error(
      { context: "worker", worker: WORKER_ID, error: String(err) },
      "Tick failed",
    ),
  );
}, POLL_INTERVAL_MS);
