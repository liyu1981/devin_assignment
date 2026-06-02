import { getAllIssues } from "@/lib/models/issues";

export const dynamic = "force-dynamic";

export default function Home() {
  const issues = getAllIssues();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Issue → Devin → PR
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Dashboard tracking GitHub issues processed by Devin
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        {issues.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
            <p className="text-lg">No issues yet</p>
            <p className="text-sm mt-1">
              Install the GitHub webhook to start receiving issues
            </p>
          </div>
        ) : (
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
                    className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="py-3 px-4">
                      <a
                        href={`https://github.com/${issue.repo}/issues/${issue.issue_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        #{issue.issue_number} {issue.title}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {issue.repo}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          issue.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : issue.status === "running"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {issue.pr_url ? (
                        <a
                          href={issue.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
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
        )}
      </main>
    </div>
  );
}
