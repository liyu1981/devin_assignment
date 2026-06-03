import "dotenv/config";
import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.GITHUB_MOCK_PORT) || 4001;
const WEBHOOK_URL =
  process.env.GITHUB_WEBHOOK_URL || "http://localhost:3000/api/github/webhook";
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "mock-secret";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

function signPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

function collectBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: string) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
  });
}

async function forwardToWebhook(
  event: string,
  payload: object,
): Promise<{ status: number; body: string }> {
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody);

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": signature,
      "user-agent": "mock-github-server",
    },
    body: rawBody,
  });

  const body = await response.text();
  return { status: response.status, body };
}

function buildIssuePayload(
  action: string,
  repo: string,
  title: string,
  body: string,
) {
  const id = Math.floor(Math.random() * 1_000_000) + 100_000;
  const number = Math.floor(Math.random() * 999) + 1;

  return {
    action,
    issue: {
      id,
      number,
      title,
      body,
      user: { login: "mock-user", id: 12345 },
      state: "open",
      locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    repository: {
      id: 98765,
      full_name: repo,
      private: false,
      owner: { login: repo.split("/")[0], id: 54321 },
    },
    sender: { login: "mock-user", id: 12345 },
  };
}

const server = http.createServer(
  async (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.url === "/" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        endpoints: {
          "POST /trigger/issues":
            "Simulate a GitHub issue event. Body: { repo, title, body?, action? }",
        },
      });
      return;
    }

    if (req.url === "/trigger/issues" && req.method === "POST") {
      const raw = await collectBody(req);
      let params: Record<string, string>;
      try {
        params = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid JSON body" });
        return;
      }

      if (!params.repo || !params.title) {
        sendJson(res, 400, {
          error: "missing required fields: repo, title",
        });
        return;
      }

      const action = params.action || "opened";
      const payload = buildIssuePayload(
        action,
        params.repo,
        params.title,
        params.body || "",
      );

      console.log(
        `[mock-github] Forwarding ${action} issue to ${WEBHOOK_URL}`,
        JSON.stringify({
          repo: params.repo,
          issueNumber: payload.issue.number,
          title: params.title,
        }),
      );

      const result = await forwardToWebhook("issues", payload);

      console.log(
        `[mock-github] Webhook responded: ${result.status} ${result.body}`,
      );

      sendJson(res, result.status, {
        ok: result.status < 400,
        webhook_url: WEBHOOK_URL,
        webhook_status: result.status,
        webhook_body: result.body,
        payload: {
          repo: params.repo,
          issueNumber: payload.issue.number,
          title: params.title,
          action,
        },
      });
      return;
    }

    sendJson(res, 404, { error: "not found" });
  },
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-github] Listening on http://localhost:${PORT}`);
  console.log(`[mock-github] Forwarding signed webhooks to ${WEBHOOK_URL}`);
  console.log(
    `[mock-github] Try: curl -X POST http://localhost:${PORT}/trigger/issues \\`,
  );
  console.log(
    `  -H 'Content-Type: application/json' -d '{"repo":"owner/repo","title":"Fix bug","body":"description"}'`,
  );
});
