import "dotenv/config";
import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.DEVIN_MOCK_PORT) || 4000;
const DELAY_MS = Math.max(1, Number(process.env.DEVIN_MOCK_DELAY_MS) || 60_000);
const SHOULD_FAIL = process.env.DEVIN_MOCK_FAIL === "true";

type SessionEntry = {
  org_id: string;
  created: number;
};

const sessions = new Map<string, SessionEntry>();

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function buildSessionResponse(id: string, org_id: string, now: number) {
  const entry = sessions.get(id);
  if (!entry) return null;

  const elapsed = now - entry.created;
  const isError = SHOULD_FAIL;

  const base = {
    session_id: id,
    url: `https://app.devin.ai/sessions/${id}`,
    org_id,
    tags: [] as string[],
    created_at: entry.created,
    updated_at: now,
    acus_consumed: 0,
    title: null,
    user_id: null,
    service_user_id: null,
    origin: "api",
    is_archived: false,
    category: null,
    subcategory: null,
    structured_output: null,
    playbook_id: null,
    parent_session_id: null,
    child_session_ids: null,
    pull_requests: [] as { pr_url: string; pr_state: string }[],
  };

  // running & working
  if (elapsed < 15000) {
    return {
      ...base,
      status: "running",
      status_detail: "working",
    };
  }

  // finished with PR
  if (isError) {
    return {
      ...base,
      status: "error",
      status_detail: "error",
    };
  }

  const prUrl = `https://github.com/liyu1981/superset/pull/${Math.floor(Math.random() * 999) + 1}`;
  return {
    ...base,
    status: "exit",
    status_detail: "finished",
    pull_requests: [{ pr_url: prUrl, pr_state: "open" }],
  };
}

function parseUrl(path: string): {
  route: string;
  org_id?: string;
  devin_id?: string;
} {
  const createMatch = path.match(
    /^\/v3\/organizations\/([^/]+)\/sessions$/,
  );
  if (createMatch)
    return { route: "create-session", org_id: createMatch[1] };

  const messagesMatch = path.match(
    /^\/v3\/organizations\/([^/]+)\/sessions\/([^/]+)\/messages$/,
  );
  if (messagesMatch)
    return {
      route: "messages",
      org_id: messagesMatch[1],
      devin_id: messagesMatch[2],
    };

  const getMatch = path.match(
    /^\/v3\/organizations\/([^/]+)\/sessions\/([^/]+)$/,
  );
  if (getMatch)
    return {
      route: "get-session",
      org_id: getMatch[1],
      devin_id: getMatch[2],
    };

  return { route: "not-found" };
}

const server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    const { route, org_id, devin_id } = parseUrl(req.url ?? "/");

    if (route === "create-session" && req.method === "POST") {
      req.resume();
      req.on("end", () => {
        if (!org_id) {
          sendJson(res, 400, { error: "org_id is required" });
          return;
        }
        const id = `devin-${crypto.randomUUID()}`;
        sessions.set(id, { org_id, created: Date.now() });
        console.log(
          `[mock-devin] Created session ${id} for org ${org_id}`,
        );

        const entry = sessions.get(id)!;
        const now = Date.now();
        const result = buildSessionResponse(id, org_id, now);
        sendJson(res, 200, result);
      });
      return;
    }

    if (route === "get-session" && req.method === "DELETE") {
      if (!org_id || !devin_id) {
        sendJson(res, 400, { error: "org_id and devin_id are required" });
        return;
      }
      const entry = sessions.get(devin_id);
      if (!entry) {
        sendJson(res, 404, { error: "session not found" });
        return;
      }
      if (entry.org_id !== org_id) {
        sendJson(res, 404, { error: "session not found" });
        return;
      }
      sessions.delete(devin_id);
      console.log(`[mock-devin] Session ${devin_id} terminated`);
      sendJson(res, 200, { success: true });
      return;
    }

    if (route === "messages" && req.method === "GET") {
      if (!org_id || !devin_id) {
        sendJson(res, 400, { error: "org_id and devin_id are required" });
        return;
      }
      const entry = sessions.get(devin_id);
      if (!entry) {
        sendJson(res, 404, { error: "session not found" });
        return;
      }
      const now = Date.now();
      const elapsed = now - entry.created;
      const items: {
        event_id: string;
        source: string;
        message: string;
        created_at: number;
      }[] = [];

      const t0 = Math.floor(entry.created / 1000);

      items.push({
        event_id: `event-${crypto.randomUUID()}`,
        source: "user",
        message: "Implement the feature requested in the GitHub issue.",
        created_at: t0,
      });

      if (elapsed > 5000) {
        items.push({
          event_id: `event-${crypto.randomUUID()}`,
          source: "devin",
          message: "On it — I'll analyze the codebase and make the necessary changes.",
          created_at: t0 + 5,
        });
      }

      if (elapsed > 15000) {
        items.push({
          event_id: `event-${crypto.randomUUID()}`,
          source: "devin",
          message: "I've identified the relevant files and am working on the implementation.",
          created_at: t0 + 15,
        });
      }

      if (elapsed > 10000) {
        const prNum = Math.floor(Math.random() * 999) + 1;
        items.push({
          event_id: `event-${crypto.randomUUID()}`,
          source: "devin",
          message: `PR created: https://github.com/liyu1981/superset/pull/${prNum}\n\nAll changes have been implemented. PR is ready for review.`,
          created_at: t0 + 22,
        });
      }

      sendJson(res, 200, { items, end_cursor: null, has_next_page: false, total: null });
      return;
    }

    if (route === "get-session" && req.method === "GET") {
      if (!org_id || !devin_id) {
        sendJson(res, 400, { error: "org_id and devin_id are required" });
        return;
      }

      const entry = sessions.get(devin_id);
      if (!entry) {
        console.log(`[mock-devin] Session ${devin_id} not found`);
        sendJson(res, 404, { error: "session not found" });
        return;
      }

      if (entry.org_id !== org_id) {
        console.log(
          `[mock-devin] Session ${devin_id} org mismatch`,
        );
        sendJson(res, 404, { error: "session not found" });
        return;
      }

      const now = Date.now();
      const result = buildSessionResponse(devin_id, org_id, now);
      if (!result) {
        sendJson(res, 404, { error: "session not found" });
        return;
      }

      console.log(
        `[mock-devin] Session ${devin_id} status: ${result.status}`,
      );
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "not found" });
  },
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[mock-devin] Listening on http://localhost:${PORT}`);
  console.log(`[mock-devin] Delay: ${DELAY_MS}ms, Fail mode: ${SHOULD_FAIL}`);
});
