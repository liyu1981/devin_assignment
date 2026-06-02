"use client";

import { useState } from "react";
import type { Issue } from "@/lib/models/issues";

function statusBadge(status: Issue["status"]) {
  const styles = {
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
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
      <div className="text-zinc-800 dark:text-zinc-200">{children}</div>
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

function DetailPanel({
  issue,
  onClose,
}: {
  issue: Issue;
  onClose: () => void;
}) {
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

        <div className="px-6 py-5 space-y-6">
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

          <Section title="Devin Logs">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 dark:text-zinc-500 font-mono">
              {issue.devin_session_id ? (
                <span className="italic">
                  Session logs will appear here once Devin completes processing.
                </span>
              ) : (
                <span className="italic">
                  Waiting for Devin session to be created.
                </span>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function IssueTable({ issues }: { issues: Issue[] }) {
  const [selected, setSelected] = useState<Issue | null>(null);

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
