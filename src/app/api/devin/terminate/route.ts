import { terminateSession } from "@/lib/devin";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const { sessionId, issueId, markAs } = await request.json();

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const data = await terminateSession(sessionId, issueId ?? undefined, markAs ?? "failed");
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
