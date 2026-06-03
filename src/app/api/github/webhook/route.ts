import { type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createIssue } from "@/lib/models/issues";
import { logger } from "@/lib/logger";

function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event");

  if (!event || !signature) {
    return new Response("missing headers", { status: 400 });
  }

  const rawBody = await req.text();

  if (process.env.GITHUB_MOCK !== "true") {
    const isValid = verifySignature(
      rawBody,
      signature,
      process.env.GITHUB_WEBHOOK_SECRET!,
    );

    if (!isValid) {
      logger.warn({ context: "webhook" }, "Invalid signature");
      return new Response("invalid signature", { status: 401 });
    }
  }

  if (event !== "issues") {
    return Response.json({ ok: true });
  }

  const payload = JSON.parse(rawBody);

  if (payload.action !== "opened") {
    return Response.json({ ok: true });
  }

  const repo = payload.repository?.full_name as string;
  logger.info(
    {
      context: "webhook",
      repo,
      issueNumber: payload.issue.number,
      title: payload.issue.title,
    },
    "Issue opened",
  );

  const result = createIssue({
    githubIssueId: payload.issue.id,
    issueNumber: payload.issue.number,
    repo,
    title: payload.issue.title,
    body: payload.issue.body ?? "",
  });

  return Response.json({ ok: true });
}
