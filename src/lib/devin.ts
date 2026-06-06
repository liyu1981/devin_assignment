import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import {
  appendLog,
  markCompleted,
  markFailed,
  markWaitingForUser,
  updatePrUrl,
} from "@/lib/models/issues";

export type DevinSession = {
  id: string;
  url: string;
};

export type DevinStatus = {
  completed: boolean;
  failed: boolean;
  prUrl: string | null;
};

export type DevinStatusRaw = {
  status: string;
  status_detail?: string;
  pull_requests?: { pr_url: string; pr_state: string }[];
};

const FAILED_STATUSES = new Set(["error", "suspended"]);

function baseUrl() {
  if (process.env.DEVIN_MOCK === "true") {
    const port = process.env.DEVIN_MOCK_PORT || "4000";
    return `http://localhost:${port}`;
  }
  return "https://api.devin.ai";
}

function getOrgIdOrThrow() {
  const orgId = process.env.DEVIN_ORG_ID;
  if (!orgId) {
    throw new Error(
      "DEVIN_ORG_ID is required. Set it to your organization ID.",
    );
  }
  return orgId;
}

function getApiKeyOrThrow() {
  const key = process.env.DEVIN_API_KEY;
  if (!key && process.env.DEVIN_MOCK !== "true") {
    throw new Error(
      "DEVIN_API_KEY is required when using the real Devin API. " +
        "Set DEVIN_MOCK=true to use the mock server and skip this check.",
    );
  }
  return key || "";
}

export async function createSession(
  repo: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
): Promise<DevinSession> {
  const apiKey = getApiKeyOrThrow();
  const orgId = getOrgIdOrThrow();

  logger.info({ context: "devin", title: issueTitle }, "Creating session");

  const prompt = `Repository: ${repo}

GitHub Issue #${issueNumber}

Title:
${issueTitle}

Requirements:
${issueBody}

Note: Do not wait for CI to finish before reporting completion. Report done as soon as the PR is created.`;

  const response = await fetch(
    `${baseUrl()}/v3/organizations/${orgId}/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    },
  );

  if (!response.ok) {
    logger.error(
      { context: "devin", status: response.status },
      "Failed to create session",
    );
    throw new Error(
      `Devin API error: ${response.status} ${await response.text()}`,
    );
  }

  const session = (await response.json()) as {
    session_id: string;
    url: string;
  };
  logger.info(
    { context: "devin", sessionId: session.session_id },
    "Session created",
  );
  return { id: session.session_id, url: session.url };
}

export async function getSessionStatus(
  sessionId: string,
): Promise<{ status: DevinStatus; raw: DevinStatusRaw }> {
  const apiKey = getApiKeyOrThrow();
  const orgId = getOrgIdOrThrow();

  const response = await fetch(
    `${baseUrl()}/v3/organizations/${orgId}/sessions/${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    logger.error(
      { context: "devin", sessionId, status: response.status },
      "Failed to get session status",
    );
    throw new Error(
      `Devin API error: ${response.status} ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    status: string;
    pull_requests?: { pr_url: string; pr_state: string }[];
  };

  logger.info(
    { context: "devin", sessionId, status: data.status },
    "Session status",
  );

  return {
    status: {
      completed: data.status === "exit",
      failed: FAILED_STATUSES.has(data.status),
      prUrl: data.pull_requests?.[0]?.pr_url ?? null,
    },
    raw: data,
  };
}

export async function terminateSession(
  sessionId: string,
  issueId?: number,
  markAs: "failed" | "completed" = "failed",
) {
  const apiKey = getApiKeyOrThrow();
  const orgId = getOrgIdOrThrow();

  const response = await fetch(
    `${baseUrl()}/v3/organizations/${orgId}/sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!response.ok) {
    logger.error({ context: "devin", sessionId, status: response.status }, "Failed to terminate session");
    throw new Error(`Devin API error: ${response.status} ${await response.text()}`);
  }

  logger.info({ context: "devin", sessionId }, "Session terminated");

  if (issueId) {
    if (markAs === "completed") {
      const row = db
        .prepare("SELECT pr_url FROM issues WHERE id = ?")
        .get(issueId) as { pr_url: string | null } | undefined;
      markCompleted(issueId, row?.pr_url ?? "");
      logger.info({ context: "devin", issueId }, "Issue marked completed after termination");
    } else {
      markFailed(issueId);
      logger.info({ context: "devin", issueId }, "Issue marked failed after termination");
    }
  }

  const data = await response.json().catch(() => ({}));
  return data;
}

export async function pollSessionStatus(sessionId: string, issueId: number) {
  const { status: result, raw } = await getSessionStatus(sessionId);
  appendLog(issueId, "Manual Status Poll Response", "receive", raw);

  if (raw.status_detail === "waiting_for_user") {
    const prUrl = raw.pull_requests?.[0]?.pr_url ?? undefined;
    markWaitingForUser(issueId, prUrl);
    logger.info({ context: "devin", issueId, sessionId }, "Manual poll: session waiting for user");
  } else if (result.failed) {
    markFailed(issueId);
    logger.info({ context: "devin", issueId, sessionId }, "Manual poll: session failed");
  } else if (result.completed) {
    markCompleted(issueId, result.prUrl ?? "");
    logger.info({ context: "devin", issueId, sessionId, prUrl: result.prUrl }, "Manual poll: session completed");
  } else {
    if (raw.pull_requests?.[0]?.pr_url) {
      updatePrUrl(issueId, raw.pull_requests[0].pr_url);
    }
    logger.info({ context: "devin", issueId, sessionId, status: raw.status }, "Manual poll: session still running");
  }

  return { status: raw.status, status_detail: raw.status_detail };
}

export async function getSessionMessages(sessionId: string, issueId?: number) {
  const apiKey = getApiKeyOrThrow();
  const orgId = getOrgIdOrThrow();

  const response = await fetch(
    `${baseUrl()}/v3/organizations/${orgId}/sessions/${sessionId}/messages`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Devin API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();

  if (issueId) {
    appendLog(issueId, "Agent Messages Response", "receive", data);
  }

  return data;
}
