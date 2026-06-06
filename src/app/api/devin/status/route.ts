import { pollSessionStatus } from "@/lib/devin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { sessionId, issueId } = await request.json();

  if (!sessionId || !issueId) {
    return Response.json(
      { error: "sessionId and issueId are required" },
      { status: 400 },
    );
  }

  try {
    const result = await pollSessionStatus(sessionId, issueId);
    return Response.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
