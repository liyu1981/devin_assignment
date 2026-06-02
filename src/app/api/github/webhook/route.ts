import { createIssue, setSessionId } from "@/lib/models/issues";
import { createSession } from "@/lib/devin";

export async function POST(req: Request) {
  const payload = await req.json();

  if (payload.action !== "opened") {
    return Response.json({});
  }

  const result = createIssue({
    githubIssueId: payload.issue.id,
    issueNumber: payload.issue.number,
    repo: payload.repository.full_name,
    title: payload.issue.title,
    body: payload.issue.body ?? "",
  });

  const issueId = Number(result.lastInsertRowid);

  const session = await createSession(payload.issue.title, payload.issue.body ?? "");

  setSessionId(issueId, session.id);

  return Response.json({ ok: true });
}
