import { logger } from "@/lib/logger";

export type DevinSession = {
  id: string;
  url: string;
};

export type DevinStatus = {
  completed: boolean;
  failed: boolean;
  prUrl: string | null;
};

const FAILED_STATUSES = new Set(["error", "failed", "crashed", "stopped"]);

function baseUrl() {
  if (process.env.DEVIN_MOCK === "true") {
    const port = process.env.DEVIN_MOCK_PORT || "4000";
    return `http://localhost:${port}`;
  }
  return "https://api.devin.ai";
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
  issueTitle: string,
  issueBody: string,
): Promise<DevinSession> {
  const apiKey = getApiKeyOrThrow();

  logger.info({ context: "devin", title: issueTitle }, "Creating session");

  const response = await fetch(`${baseUrl()}/v1/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `Implement the following GitHub issue:\n\nTitle: ${issueTitle}\n\nDescription: ${issueBody}`,
    }),
  });

  if (!response.ok) {
    logger.error(
      { context: "devin", status: response.status },
      "Failed to create session",
    );
    throw new Error(
      `Devin API error: ${response.status} ${await response.text()}`,
    );
  }

  const session = (await response.json()) as DevinSession;
  logger.info({ context: "devin", sessionId: session.id }, "Session created");
  return session;
}

export async function getSessionStatus(
  sessionId: string,
): Promise<DevinStatus> {
  const apiKey = getApiKeyOrThrow();

  const response = await fetch(`${baseUrl()}/v1/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

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
    pr_url?: string;
  };

  logger.info(
    { context: "devin", sessionId, status: data.status },
    "Session status",
  );

  return {
    completed: data.status === "completed",
    failed: FAILED_STATUSES.has(data.status),
    prUrl: data.pr_url ?? null,
  };
}
