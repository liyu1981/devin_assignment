import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { logger } from "@/lib/logger";

const DB_PATH = path.join(process.cwd(), "var/app.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const migrate = db.transaction(() => {
  const applied = new Set(
    db
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((r: any) => r.name),
  );

  for (const file of migrationFiles) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    logger.info({ context: "db", file }, "Applied migration");
  }
});

migrate();
