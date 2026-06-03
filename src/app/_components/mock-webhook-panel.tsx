"use client";

import { useEffect, useState } from "react";

export default function MockWebhookPanel({ mockPort }: { mockPort: string }) {
  const [mockUrl, setMockUrl] = useState(`http://localhost:${mockPort}`);

  useEffect(() => {
    setMockUrl(`http://${window.location.hostname}:${mockPort}`);
  }, [mockPort]);

  const [repo, setRepo] = useState("liyu1981/superset");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    body: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch(`${mockUrl}/trigger/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, title, body }),
      });
      const text = await response.text();
      setResult({ status: response.status, body: text });
    } catch (err) {
      setResult({
        status: 0,
        body: `Failed to reach mock server: ${err}`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Mock Webhook Trigger
        </h2>
        <span className="text-xs text-zinc-400 ml-auto">{mockUrl}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="mock-repo"
              className="block text-xs text-zinc-500 mb-1"
            >
              Repo
            </label>
            <input
              id="mock-repo"
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="mock-title"
              className="block text-xs text-zinc-500 mb-1"
            >
              Title
            </label>
            <input
              id="mock-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="mock-body"
            className="block text-xs text-zinc-500 mb-1"
          >
            Body
          </label>
          <textarea
            id="mock-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sending || !title}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white px-4 py-1.5 text-sm font-medium transition-colors"
          >
            {sending ? "Sending..." : "Trigger Issue"}
          </button>

          {result && (
            <span
              className={`text-xs font-mono ${
                result.status >= 200 && result.status < 300
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.status > 0 ? `${result.status}` : "ERR"}: {result.body}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
