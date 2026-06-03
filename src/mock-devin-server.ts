import "dotenv/config";
import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.DEVIN_MOCK_PORT) || 4000;
const DELAY_MS = Math.max(1, Number(process.env.DEVIN_MOCK_DELAY_MS) || 60_000);
const SHOULD_FAIL = process.env.DEVIN_MOCK_FAIL === "true";

const sessions = new Map<string, { created: number }>();

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseUrl(path: string): { route: string; sessionId?: string } {
  const match = path.match(/^\/v1\/sessions\/(.+)$/);
  if (match) return { route: "get-session", sessionId: match[1] };
  if (path === "/v1/sessions") return { route: "create-session" };
  return { route: "not-found" };
}

const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    const { route, sessionId } = parseUrl(req.url ?? "/");

    if (route === "create-session" && req.method === "POST") {
      req.resume();
      req.on("end", () => {
        const id = `mock-session-${crypto.randomUUID()}`;
        sessions.set(id, { created: Date.now() });
        console.log(`[mock-devin] Created session ${id}`);
        sendJson(res, 200, { id, url: `https://app.devin.ai/sessions/${id}` });
      });
      return;
    }

    if (route === "get-session" && req.method === "GET") {
      const entry = sessionId ? sessions.get(sessionId) : undefined;
      if (!entry) {
        console.log(`[mock-devin] Session ${sessionId} not found`);
        sendJson(res, 404, { error: "session not found" });
        return;
      }

      const elapsed = Date.now() - entry.created;

      if (elapsed < DELAY_MS) {
        console.log(`[mock-devin] Session ${sessionId} still running`);
        sendJson(res, 200, { status: "running" });
        return;
      }

      if (SHOULD_FAIL) {
        console.log(`[mock-devin] Session ${sessionId} failed`);
        sendJson(res, 200, { status: "failed" });
        return;
      }

      const prUrl = `https://github.com/mock-org/mock-repo/pull/${Math.floor(Math.random() * 999) + 1}`;
      console.log(`[mock-devin] Session ${sessionId} completed: ${prUrl}`);
      sendJson(res, 200, { status: "completed", pr_url: prUrl });
      return;
    }

    sendJson(res, 404, { error: "not found" });
  },
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-devin] Listening on http://localhost:${PORT}`);
  console.log(`[mock-devin] Delay: ${DELAY_MS}ms, Fail mode: ${SHOULD_FAIL}`);
});
