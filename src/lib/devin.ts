export type DevinSession = {
  id: string;
  url: string;
};

export type DevinStatus = {
  completed: boolean;
  prUrl: string | null;
};

export async function createSession(issueTitle: string, issueBody: string): Promise<DevinSession> {
  const apiKey = process.env.DEVIN_API_KEY;
  if (!apiKey) {
    throw new Error("DEVIN_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.devin.ai/v1/sessions", {
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
    throw new Error(`Devin API error: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<DevinSession>;
}

export async function getSessionStatus(sessionId: string): Promise<DevinStatus> {
  const apiKey = process.env.DEVIN_API_KEY;
  if (!apiKey) {
    throw new Error("DEVIN_API_KEY environment variable is not set");
  }

  const response = await fetch(`https://api.devin.ai/v1/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Devin API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    status: string;
    pr_url?: string;
  };

  return {
    completed: data.status === "completed",
    prUrl: data.pr_url ?? null,
  };
}
