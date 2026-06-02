I agree. For a demo, adding Drizzle or Prisma introduces a lot of files, migrations, and abstraction without much benefit.

A simpler stack would be:

```text
Next.js 15
├── App Router
├── API Routes
├── better-sqlite3
├── GitHub App
└── Devin API
```

No ORM, no migration framework.

## Simplified Architecture

```text
src/
├── app/
│   ├── page.tsx
│   └── api/
│       ├── github/
│       │   └── webhook/
│       │       └── route.ts
│       └── jobs/
│           └── poll/
│               └── route.ts
│
├── lib/
│   ├── db.ts
│   ├── github.ts
│   ├── devin.ts
│   └── models/
│       └── issues.ts
│
└── data/
    └── app.db
```

---

# Database Setup

Install:

```bash
npm install better-sqlite3
```

`lib/db.ts`

```ts
import Database from "better-sqlite3";

export const db = new Database("data/app.db");

db.exec(`
CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    github_issue_id INTEGER NOT NULL,

    issue_number INTEGER NOT NULL,

    repo TEXT NOT NULL,

    title TEXT NOT NULL,

    body TEXT,

    status TEXT NOT NULL,

    devin_session_id TEXT,

    pr_url TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);
```

This initializes automatically at startup.

---

# Repository Layer (Optional)

I still recommend a tiny repository layer—not an ORM, just a place to keep SQL.

`lib/models/issues.ts`

```ts
import { db } from "../db";

export function createIssue(data: {
  githubIssueId: number;
  issueNumber: number;
  repo: string;
  title: string;
  body: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO issues (
      github_issue_id,
      issue_number,
      repo,
      title,
      body,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    data.githubIssueId,
    data.issueNumber,
    data.repo,
    data.title,
    data.body,
    "pending"
  );
}
```

Find active sessions:

```ts
export function getRunningIssues() {
  return db.prepare(`
    SELECT *
    FROM issues
    WHERE status IN ('pending', 'running')
  `).all();
}
```

Update session:

```ts
export function setSessionId(
  issueId: number,
  sessionId: string
) {
  db.prepare(`
    UPDATE issues
    SET
      devin_session_id = ?,
      status = 'running'
    WHERE id = ?
  `).run(sessionId, issueId);
}
```

Mark complete:

```ts
export function markCompleted(
  issueId: number,
  prUrl: string
) {
  db.prepare(`
    UPDATE issues
    SET
      status = 'completed',
      pr_url = ?
    WHERE id = ?
  `).run(prUrl, issueId);
}
```

---

# Webhook Flow

`app/api/github/webhook/route.ts`

```ts
export async function POST(req: Request) {
  const payload = await req.json();

  if (
    payload.action !== "opened"
  ) {
    return Response.json({});
  }

  const result = createIssue({
    githubIssueId: payload.issue.id,
    issueNumber: payload.issue.number,
    repo: payload.repository.full_name,
    title: payload.issue.title,
    body: payload.issue.body
  });

  const issueId =
    Number(result.lastInsertRowid);

  const session =
    await devin.createSession(...);

  setSessionId(
    issueId,
    session.id
  );

  return Response.json({
    ok: true
  });
}
```

---

# Poller

Every minute:

```ts
const issues =
  getRunningIssues();

for (const issue of issues) {
  const result =
      await devin.getStatus(
        issue.devin_session_id
      );

  if (result.completed) {

      await github.comment(
        issue.repo,
        issue.issue_number,
        result.prUrl
      );

      markCompleted(
        issue.id,
        result.prUrl
      );
  }
}
```

---

# Even Simpler: One SQL File

For a demo, you can keep schema in:

```text
schema.sql
```

```sql
CREATE TABLE issues (...);
```

and load it once:

```ts
import fs from "fs";

db.exec(
  fs.readFileSync(
    "schema.sql",
    "utf8"
  )
);
```

This avoids introducing migration tooling entirely.

---

## What I'd Actually Build

For a weekend demo:

* ✅ Next.js
* ✅ better-sqlite3
* ✅ raw SQL
* ✅ GitHub App
* ✅ Devin API wrapper
* ✅ polling endpoint
* ✅ simple dashboard

Skip:

* ❌ Prisma
* ❌ Drizzle
* ❌ Redis
* ❌ Kafka
* ❌ Queue system
* ❌ Docker
* ❌ Authentication

The entire codebase can stay under ~1,000 lines while still demonstrating the complete issue → Devin → PR workflow.
