import { db } from "@/lib/db";

export type Issue = {
  id: number;
  github_issue_id: number;
  issue_number: number;
  repo: string;
  title: string;
  body: string | null;
  status: "pending" | "running" | "completed" | "failed";
  devin_session_id: string | null;
  pr_url: string | null;
  claimed_by: string | null;
  created_at: string;
};

export type CreateIssueData = {
  githubIssueId: number;
  issueNumber: number;
  repo: string;
  title: string;
  body: string;
};

export function createIssue(data: CreateIssueData) {
  const stmt = db.prepare(`
    INSERT INTO issues (github_issue_id, issue_number, repo, title, body, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);
  return stmt.run(
    data.githubIssueId,
    data.issueNumber,
    data.repo,
    data.title,
    data.body,
  );
}

export function claimPendingIssue(workerId: string): Issue | null {
  const issue = db
    .prepare(
      "SELECT * FROM issues WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
    )
    .get() as Issue | undefined;

  if (!issue) return null;

  const result = db
    .prepare(
      "UPDATE issues SET status = 'running', claimed_by = ? WHERE id = ? AND status = 'pending'",
    )
    .run(workerId, issue.id);

  if (result.changes === 0) return null;

  return { ...issue, status: "running" as const, claimed_by: workerId };
}

export function getRunningIssues(): Issue[] {
  return db
    .prepare("SELECT * FROM issues WHERE status = 'running'")
    .all() as Issue[];
}

export function setSessionId(issueId: number, sessionId: string) {
  db.prepare("UPDATE issues SET devin_session_id = ? WHERE id = ?").run(
    sessionId,
    issueId,
  );
}

export function markCompleted(issueId: number, prUrl: string) {
  db.prepare(
    "UPDATE issues SET status = 'completed', pr_url = ? WHERE id = ?",
  ).run(prUrl, issueId);
}

export function markFailed(issueId: number) {
  db.prepare("UPDATE issues SET status = 'failed' WHERE id = ?").run(issueId);
}

export function getAllIssues(): Issue[] {
  return db
    .prepare("SELECT * FROM issues ORDER BY created_at DESC")
    .all() as Issue[];
}
