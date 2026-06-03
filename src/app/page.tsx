import { getAllIssues } from "@/lib/models/issues";
import IssueTable from "./_components/issue-table";
import MockWebhookPanel from "./_components/mock-webhook-panel";

export const dynamic = "force-dynamic";

const mockGithubPort =
  process.env.GITHUB_MOCK === "true"
    ? process.env.GITHUB_MOCK_PORT || "4001"
    : "";

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

      <main className="max-w-4xl mx-auto space-y-6">
        {mockGithubPort && <MockWebhookPanel mockPort={mockGithubPort} />}
        <IssueTable issues={issues} />
      </main>
    </div>
  );
}
