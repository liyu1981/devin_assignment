CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_issue_id INTEGER NOT NULL,
    issue_number INTEGER NOT NULL,
    repo TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    devin_session_id TEXT,
    pr_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
