Yes — for a **Next.js GitHub App webhook setup**, the flow is slightly different from a Go server because your API route *is your server*.

Below is the clean, correct setup for your demo.

---

# 1. Create GitHub App (same as before)

Go to:

[GitHub Developer Settings - GitHub Apps](https://github.com/settings/apps?utm_source=chatgpt.com)

Create app and configure:

### Webhook URL (IMPORTANT)

Instead of:

```text
http://localhost:8080/github/webhook
```

You now use Next.js API route:

```text
https://your-domain.com/api/github/webhook
```

For local dev (via ngrok):

```text
https://xxxx.ngrok-free.app/api/github/webhook
```

---

# 2. Enable Webhook Events

Select:

* Issues ✅
* Pull requests (optional for later)
* Issue comments (optional)

For your demo:

```text
Issues only is enough
```

---

# 3. GitHub App Permissions

Set:

### Repository Permissions

| Permission | Access       |
| ---------- | ------------ |
| Issues     | Read & Write |
| Contents   | Read         |
| Metadata   | Read         |

---

# 4. Install App

Install it on your test repo:

```text
Only select repositories → your repo
```

---

# 5. Next.js Webhook Endpoint

Create this file:

```text
/app/api/github/webhook/route.ts
```

This is your full webhook server.

---

# 6. IMPORTANT: Disable Body Parser Issues

GitHub webhook signature verification requires **raw body**, not parsed JSON.

In Next.js App Router, do this:

---

## Step 1 — Read raw body

```ts id="g7k2sa"
import { NextRequest } from "next/server";
import crypto from "crypto";
```

---

## Step 2 — Signature verification helper

GitHub sends:

```text
X-Hub-Signature-256
```

You MUST verify:

```ts id="w1xq9k"
function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);

  const digest =
    "sha256=" + hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}
```

---

## Step 3 — Webhook Route (Next.js style)

```ts id="k9m2qv"
export async function POST(req: NextRequest) {
  const signature =
    req.headers.get("x-hub-signature-256") || "";

  const event =
    req.headers.get("x-github-event");

  const rawBody =
    await req.text(); // IMPORTANT: raw body

  // verify webhook
  const isValid = verifySignature(
    rawBody,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return new Response("invalid signature", {
      status: 401
    });
  }

  const payload = JSON.parse(rawBody);

  // only handle issue events
  if (event !== "issues") {
    return Response.json({ ok: true });
  }

  if (payload.action !== "opened") {
    return Response.json({ ok: true });
  }

  // your logic here
  console.log("Issue:", payload.issue.title);

  // 1. store in sqlite
  // 2. call Devin
  // 3. save session

  return Response.json({ ok: true });
}
```

---

# 7. Local Development Setup (VERY IMPORTANT)

GitHub cannot call localhost.

Use ngrok:

[ngrok](https://ngrok.com/?utm_source=chatgpt.com)

```bash
ngrok http 3000
```

You get:

```text
https://abc123.ngrok-free.app
```

Set GitHub App webhook URL to:

```text
https://abc123.ngrok-free.app/api/github/webhook
```

---

# 8. Next.js Dev Server

Run:

```bash
npm run dev
```

Now flow becomes:

```text
GitHub Issue → GitHub App → ngrok → Next.js API route
```

---

# 9. Debug Checklist

If webhook doesn’t trigger:

### Check:

* GitHub App installed?
* Correct repo selected?
* Event = Issues enabled?
* ngrok running?
* correct `/api/github/webhook` path?
* logs in Next.js terminal?

---

# 10. Minimal Working Demo Flow

Once working:

```text
1. Create GitHub issue
2. Webhook hits Next.js API
3. Next.js logs issue
4. Store in SQLite
5. Trigger Devin session
```

---

# 11. Recommended Improvement (optional but useful)

Add quick debug endpoint:

```ts
/app/api/debug/webhook-log/route.ts
```

So you can inspect last payloads easily.

---

# Key Difference vs Go version

| Go version          | Next.js version    |
| ------------------- | ------------------ |
| manual server       | API route          |
| custom router       | file-based routing |
| middleware optional | built-in           |
| raw HTTP handling   | NextRequest        |

---

If you want next step, I can help you wire:

* 👉 SQLite + Next.js (clean raw SQL layer)
* 👉 Devin session trigger code (real prompt design)
* 👉 GitHub PR creation + comment back flow

Just tell me.
