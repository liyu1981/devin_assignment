# Mocks

Standalone HTTP servers for offline development. Both follow the same pattern:
zero-dependency Node.js `http` servers, configured via environment variables,
started as part of `dev:all`.

## Mock Devin Server (`src/mock-devin-server.ts`)

Replaces the real Devin API v3 (`api.devin.ai`) locally.  
The client (`src/lib/devin.ts`) routes through `DEVIN_MOCK` env var to switch endpoints.

| Endpoint | Behavior |
|----------|----------|
| `POST /v3/organizations/{org_id}/sessions` | Returns full `SessionResponse` with `session_id`, `url`, `status: "running"` |
| `GET /v3/organizations/{org_id}/sessions/{devin_id}` | Returns full `SessionResponse` — status depends on elapsed time |

### State machine per session (v3 statuses)

- Before `DEVIN_MOCK_DELAY_MS`: `{ status: "running", status_detail: "working" }`
- After delay + `DEVIN_MOCK_FAIL=true`: `{ status: "error", status_detail: "error" }`
- After delay + normal: `{ status: "exit", status_detail: "finished", pull_requests: [{ pr_url: "...", pr_state: "open" }] }`

### Config

```env
DEVIN_MOCK_PORT=4000
DEVIN_MOCK_DELAY_MS=60000
DEVIN_MOCK_FAIL=false
DEVIN_ORG_ID=org-abc123
```

---

## Mock GitHub Server (`src/mock-github-server.ts`)

Replaces real GitHub webhook delivery. Instead of GitHub sending events to your
ngrok URL, you POST to `localhost:4001/trigger/issues` and the mock server
signs and forwards a realistic webhook payload to the Next.js route.

### Endpoint

| Endpoint | Behavior |
|----------|----------|
| `GET /` | Health check / list available endpoints |
| `POST /trigger/issues` | Build a signed GitHub issue payload and forward it to the webhook route |

### `POST /trigger/issues` body

```json
{
  "repo": "owner/repo",
  "title": "Fix the thing",
  "body": "Description of the issue (optional)",
  "action": "opened"
}
```

- `action` defaults to `"opened"` (the webhook route ignores non-`opened` actions)
- `body` defaults to `""`

### What it does

1. Builds a realistic GitHub webhook payload (matching the real GitHub format)
2. Signs the raw body with HMAC-SHA256 using `GITHUB_WEBHOOK_SECRET`
3. Adds `x-github-event: issues` and `x-hub-signature-256` headers
4. POSTs to the configured `GITHUB_WEBHOOK_URL` (default: `http://localhost:3000/api/github/webhook`)
5. Returns the webhook response

### Config

```env
GITHUB_MOCK_PORT=4001
GITHUB_WEBHOOK_URL=http://localhost:3000/api/github/webhook
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### Example usage

```bash
curl -X POST http://localhost:4001/trigger/issues \
  -H 'Content-Type: application/json' \
  -d '{"repo":"liyu1981/superset","title":"change superset in readme.md to super set"}'
```

The webhook route receives and logs it like a real GitHub event:
```
{"context":"webhook","repo":"liyu1981/superset","issueNumber":2,"title":"change superset in readme.md to super set","msg":"Issue opened"}
```

---

## Running everything

```bash
npm run dev:all
```

Starts 5 processes concurrently:

```
gh ── mock-github-server  (port 4001)
mock ── mock-devin-server (port 4000)
server ── next dev        (port 3000)
w1 ── worker
w2 ── worker
```

Or start individually:

```bash
npm run mock-github     # GitHub mock on :4001
npm run mock-devin      # Devin mock on :4000
npm run worker          # worker process
```

## Edge cases

- **Webhook route not running**: mock-github will log the connection error
- **Secret mismatch**: the webhook route returns 401 and the mock logs it
- **Mock servers unavailable**: workers log fetch errors when connecting

---

## Mock Webhook Trigger UI

When `NEXT_PUBLIC_GITHUB_MOCK_URL` is set, the dashboard at `/` shows a
**Mock Webhook Trigger** panel above the issue table.

| Field | Description |
|-------|-------------|
| Repo | GitHub repo (default: `owner/repo`) |
| Title | Issue title (required) |
| Body | Issue body (optional) |

Clicking "Trigger Issue" POSTs to the mock GitHub server's
`/trigger/issues` endpoint. The response status is shown inline.

The panel is hidden when `NEXT_PUBLIC_GITHUB_MOCK_URL` is unset — no
changes to the production dashboard.
