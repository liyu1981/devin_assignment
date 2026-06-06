## Getting Started

### Prepare the repo

```bash
pnpm i
```

### Run the full dev stack (all services)

```bash
npm run dev:all
```

This starts all services concurrently:

| Service | Label | Description |
|---------|-------|-------------|
| Mock GitHub server | `gh-mock` | Simulates GitHub webhook events (port 4001) |
| Mock Devin server | `devin-mock` | Simulates the Devin API (port 4000) |
| Next.js dev server | `server` | Frontend and API routes (port 3000) |
| Worker (x2) | `w1`, `w2` | Background workers that poll pending issues and Devin sessions |

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Configuration

Copy the example env file and configure it:

```bash
cp .env.example .env
```

### Using with mocks (local development)

Set these values in `.env`:

```env
DEVIN_MOCK=true
GITHUB_MOCK=true
DEVIN_ORG_ID=your-org-id
```

- `DEVIN_MOCK=true` — routes Devin API calls to the local mock server (skips API key check)
- `GITHUB_MOCK=true` — disables webhook signature verification; enables the webhook trigger UI
- `DEVIN_ORG_ID` — required by the Devin API client, can be arbitrary string

Optional mock server settings:

```env
DEVIN_MOCK_DELAY_MS=60000   # simulated session duration before completing
DEVIN_MOCK_FAIL=false       # set to true to simulate failure
```

### Using with real GitHub and Devin

Set these values in `.env`:

```env
DEVIN_MOCK=false
GITHUB_MOCK=false

DEVIN_API_KEY=your-api-key        # from https://app.devin.ai/settings/api
DEVIN_ORG_ID=your-org-id          # required for all Devin API calls

GITHUB_WEBHOOK_SECRET=your-secret # used to verify incoming webhook signatures
```

`GITHUB_WEBHOOK_SECRET` must match the secret configured in your GitHub App
