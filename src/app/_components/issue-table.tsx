"use client";

import { useEffect, useState, useCallback } from "react";
import type { DevinLogEntry, Issue } from "@/lib/models/issues";

function logSummary(entry: DevinLogEntry): string {
  const p = entry.payload as Record<string, unknown>;
  if (entry.title === "Create Session Request" && typeof p.prompt === "string") {
    const firstLine = p.prompt.split("\n")[0];
    return firstLine;
  }
  if (entry.title === "Create Session Response" && typeof p.session_id === "string") {
    return `Session: ${p.session_id}`;
  }
  if (entry.title === "Status Poll Response" && typeof p.status === "string") {
    const detail = typeof p.status_detail === "string" ? ` — ${p.status_detail}` : "";
    const prs = Array.isArray(p.pull_requests) && (p.pull_requests as { pr_url: string }[]).length > 0
      ? `, PR: ${(p.pull_requests as { pr_url: string }[])[0]?.pr_url ?? ""}`
      : ", PR: (NO PR YET)";
    return `Status: ${p.status}${detail}${prs}`;
  }
  return "";
}

function statusBadge(status: Issue["status"]) {
  const styles = {
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    waiting_for_user:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="text-zinc-400 dark:text-zinc-500 text-sm w-28 shrink-0">
        {label}
      </span>
      <div className="text-zinc-800 dark:text-zinc-200 break-words min-w-0">{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LogEntry({ entry }: { entry: DevinLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const summary = logSummary(entry);

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            entry.direction === "send"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {entry.direction === "send" ? "SEND" : "RECV"}
        </span>
      </div>
      <div className="text-zinc-700 dark:text-zinc-300 font-semibold mb-0.5">
        {entry.title}
      </div>
      {summary && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 break-words">
          {summary}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
      >
        {expanded ? "▲ Hide details" : "▼ Show details"}
      </button>
      {expanded && (
        <pre className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words bg-zinc-100 dark:bg-zinc-800 rounded p-2 mt-1">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function parseLogs(raw: string): DevinLogEntry[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function DetailPanel({
  issue: initialIssue,
  onClose,
}: {
  issue: Issue;
  onClose: () => void;
}) {
  const [issue, setIssue] = useState(initialIssue);
  const [logs, setLogs] = useState<DevinLogEntry[]>(
    parseLogs(issue.devin_logs),
  );
  const [terminating, setTerminating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [rightTab, setRightTab] = useState<"logs" | "messages">("logs");
  const [messages, setMessages] = useState<
    { event_id: string; source: string; message: string; created_at: number }[]
  >([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const refreshIssue = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/poll");
      const data = await res.json();
      const updated = data.issues.find((i: Issue) => i.id === issue.id);
      if (updated) {
        setIssue(updated);
        setLogs(parseLogs(updated.devin_logs));
      }
    } catch {
      // ignore poll errors
    }
  }, [issue.id]);

  useEffect(() => {
    const interval = setInterval(refreshIssue, 2000);
    return () => clearInterval(interval);
  }, [refreshIssue]);

  useEffect(() => {
    if (rightTab !== "messages" || !issue.devin_session_id) return;

    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError("");

    fetch(`/api/devin/messages?sessionId=${issue.devin_session_id}&issueId=${issue.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const items = data?.items ?? (Array.isArray(data) ? data : []);
          setMessages(items);
          setMessagesLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMessagesError(err.message);
          setMessagesLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [rightTab, issue.devin_session_id]);

  const handleTerminate = async () => {
    if (!confirm("Terminate this Devin session? The issue will be marked as failed.")) return;
    setTerminating(true);
    try {
      const res = await fetch("/api/devin/terminate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: issue.devin_session_id, issueId: issue.id, markAs: "failed" }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to terminate: ${err.error}`);
      }
    } catch {
      alert("Failed to terminate session");
    } finally {
      setTerminating(false);
    }
  };

  const handleTerminateCompleted = async () => {
    if (!confirm("Terminate this Devin session and mark as completed?")) return;
    setTerminating(true);
    try {
      const res = await fetch("/api/devin/terminate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: issue.devin_session_id, issueId: issue.id, markAs: "completed" }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to terminate: ${err.error}`);
      }
    } catch {
      alert("Failed to terminate session");
    } finally {
      setTerminating(false);
    }
  };

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/devin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: issue.devin_session_id, issueId: issue.id }),
      });
      if (res.ok) {
        refreshIssue();
      } else {
        const err = await res.json();
        alert(`Failed to update status: ${err.error}`);
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative mt-auto w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl border-t border-zinc-200 dark:border-zinc-700 max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate pr-4">
            #{issue.issue_number} {issue.title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-[2fr_3fr] gap-6 px-6 py-5">
          <div className="space-y-6 min-w-0 break-words">
            <Section title="Info">
              <DetailRow label="Repo">{issue.repo}</DetailRow>
              <DetailRow label="Status">{statusBadge(issue.status)}</DetailRow>
              <DetailRow label="Issue #">
                <a
                  href={`https://github.com/${issue.repo}/issues/${issue.issue_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  #{issue.issue_number}
                </a>
              </DetailRow>
              <DetailRow label="Created">
                {new Date(issue.created_at).toLocaleString()}
              </DetailRow>
            </Section>

            <Section title="Devin Session">
              <DetailRow label="Claimed By">
                {issue.claimed_by ?? (
                  <span className="text-zinc-400 italic">—</span>
                )}
              </DetailRow>
              <DetailRow label="Session ID">
                {issue.devin_session_id ?? (
                  <span className="text-zinc-400 italic">Not started</span>
                )}
              </DetailRow>
              <DetailRow label="Pull Request">
                {issue.pr_url ? (
                  <a
                    href={issue.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {issue.pr_url}
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">Not available</span>
                )}
              </DetailRow>
              {issue.devin_session_id && (issue.status === "running" || issue.status === "waiting_for_user") && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="text-xs px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? "Updating..." : "Update Status"}
                  </button>
                  <button
                    onClick={handleTerminate}
                    disabled={terminating}
                    className="text-xs px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {terminating ? "Terminating..." : "Terminate (Fail)"}
                  </button>
                  <button
                    onClick={handleTerminateCompleted}
                    disabled={terminating}
                    className="text-xs px-3 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {terminating ? "Terminating..." : "Terminate (Complete)"}
                  </button>
                </div>
              )}
            </Section>

            <Section title="Issue Body">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                {issue.body || (
                  <span className="italic text-zinc-400">
                    No description provided
                  </span>
                )}
              </div>
            </Section>
          </div>

          <div className="space-y-3 min-w-0 break-words">
            <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setRightTab("logs")}
                className={`text-xs font-medium px-3 py-1.5 rounded-t -mb-px border-b-2 transition-colors ${
                  rightTab === "logs"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => setRightTab("messages")}
                className={`text-xs font-medium px-3 py-1.5 rounded-t -mb-px border-b-2 transition-colors ${
                  rightTab === "messages"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                Agent Messages
              </button>
            </div>

            {rightTab === "logs" ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm font-mono space-y-3 max-h-[calc(80vh-10rem)] overflow-y-auto break-words">
                {logs.length === 0 ? (
                  <span className="italic text-zinc-400 dark:text-zinc-500">
                    No logs yet.
                  </span>
                ) : (
                  logs.slice().reverse().map((entry, i) => (
                    <LogEntry key={i} entry={entry} />
                  ))
                )}
              </div>
            ) : !issue.devin_session_id ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500 italic">
                No Devin session yet.
              </div>
            ) : messagesLoading ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500 italic">
                Loading messages...
              </div>
            ) : messagesError ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-red-500 italic">
                Error: {messagesError}
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500 italic">
                No messages yet.
              </div>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm space-y-3 max-h-[calc(80vh-10rem)] overflow-y-auto break-words">
                {messages.map((msg, i) => (
                  <div key={msg.event_id || i} className="border-b border-zinc-200 dark:border-zinc-700 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          msg.source === "devin"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {msg.source === "devin" ? "AGENT" : "USER"}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(msg.created_at * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IssueTable({
  issues: initialIssues,
}: {
  issues: Issue[];
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [selected, setSelected] = useState<Issue | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs/poll");
        const data = await res.json();
        if (data.issues) {
          setIssues(data.issues);
          setSelected((prev) => {
            if (!prev) return prev;
            const updated = data.issues.find((i: Issue) => i.id === prev.id);
            return updated ?? prev;
          });
        }
      } catch {
        // Polling errors are ignored
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (issues.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
        <p className="text-lg">No issues yet</p>
        <p className="text-sm mt-1">
          Install the GitHub webhook to start receiving issues
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-3 px-4 font-medium text-zinc-500">
                Issue
              </th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">
                Repo
              </th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">
                PR
              </th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => setSelected(issue)}
                className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    #{issue.issue_number} {issue.title}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                  {issue.repo}
                </td>
                <td className="py-3 px-4">{statusBadge(issue.status)}</td>
                <td className="py-3 px-4">
                  {issue.pr_url ? (
                    <a
                      href={issue.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      PR #{issue.pr_url.split("/").pop()}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">
                  {new Date(issue.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailPanel issue={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
