export async function commentOnIssue(
  repo: string,
  issueNumber: number,
  message: string,
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("GITHUB_TOKEN not set; skipping comment");
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "devin-issue-bot",
      },
      body: JSON.stringify({ body: message }),
    },
  );

  if (!response.ok) {
    console.error("Failed to comment on issue", await response.text());
  }
}
