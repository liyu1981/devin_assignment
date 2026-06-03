> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Common Flows

> End-to-end workflow guides for common API use cases

This page walks through common end-to-end workflows with the Devin API. Each flow includes the full sequence of API calls with code examples. For individual endpoint details, see the relevant API reference pages.

## Setup

Set these environment variables before running any example:

```bash theme={null}
# Required: your service user API key (starts with cog_)
export DEVIN_API_KEY="cog_your_key_here"

# Required: your organization ID (find it on Settings > Service Users)
export DEVIN_ORG_ID="your_org_id"
```

***

## Getting started: API key to first session

The most common workflow — authenticate, discover your account, and create your first session.

### Step 1: Verify your credentials

<Note>Organization-scoped service users can skip to Step 3 — you already know your org ID from the Settings page.</Note>

```bash theme={null}
curl "https://api.devin.ai/v3/self" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

Response:

```json theme={null}
{
  "principal_type": "service_user",
  "service_user_id": "service-user-abc123",
  "service_user_name": "CI Bot",
  "org_id": null
}
```

### Step 2: List your organizations

**Enterprise service users** can list all organizations:

```bash theme={null}
curl "https://api.devin.ai/v3/enterprise/organizations" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

**Organization-scoped service users** already know their org ID (it's on the Settings > Service Users page where the key was created).

### Step 3: Create a session

```bash theme={null}
curl -X POST "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/sessions" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a Python script that analyzes CSV data"}'
```

Response:

```json theme={null}
{
  "session_id": "devin-abc123",
  "url": "https://app.devin.ai/sessions/devin-abc123",
  "status": "running"
}
```

### Step 4: Poll for events

Monitor the session by polling for messages:

```bash theme={null}
curl "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/sessions/devin-abc123/messages" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Full Python example

```python theme={null}
import os
import time
import requests

API_KEY = os.environ["DEVIN_API_KEY"]
ORG_ID = os.environ["DEVIN_ORG_ID"]
BASE = "https://api.devin.ai/v3"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# 1. Verify credentials
me = requests.get(f"{BASE}/self", headers=HEADERS)
me.raise_for_status()
data = me.json()
print(f"Authenticated as: {data.get('service_user_name') or data.get('user_name')}")

# 2. Create a session
session = requests.post(
    f"{BASE}/organizations/{ORG_ID}/sessions",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={"prompt": "Create a Python script that analyzes CSV data"}
).json()
print(f"Session: {session['url']}")

# 3. Poll until complete
while True:
    status = requests.get(
        f"{BASE}/organizations/{ORG_ID}/sessions/{session['session_id']}",
        headers=HEADERS
    ).json()["status"]
    print(f"Status: {status}")
    if status in ("exit", "error", "suspended"):
        break
    time.sleep(10)
```

***

## Downloading session attachments

Retrieve files produced by a session (logs, screenshots, generated code, etc.).

### Step 1: Get the session

```bash theme={null}
curl "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Step 2: List attachments

```bash theme={null}
curl "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/sessions/$SESSION_ID/attachments" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

Response:

```json theme={null}
{
  "items": [
    {
      "attachment_id": "att_123",
      "name": "output.py",
      "url": "https://..."
    }
  ]
}
```

### Step 3: Download

Use the `url` from the attachment response to download the file directly.

### Full Python example

```python theme={null}
import os
import requests

API_KEY = os.environ["DEVIN_API_KEY"]
ORG_ID = os.environ["DEVIN_ORG_ID"]
SESSION_ID = os.environ["SESSION_ID"]
BASE = "https://api.devin.ai/v3"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# List attachments
attachments = requests.get(
    f"{BASE}/organizations/{ORG_ID}/sessions/{SESSION_ID}/attachments",
    headers=HEADERS
).json()["items"]

# Download each attachment
for att in attachments:
    print(f"Downloading {att['name']}...")
    content = requests.get(att["url"]).content
    with open(att["name"], "wb") as f:
        f.write(content)
    print(f"  Saved {att['name']} ({len(content)} bytes)")
```

***

## Knowledge & playbook management

Manage the context and instructions that Devin uses across sessions.

### Create a knowledge note

```bash theme={null}
curl -X POST "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/knowledge/notes" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coding standards",
    "trigger": "When writing code in any repository",
    "body": "Use TypeScript strict mode. Follow existing code style. Run lint before committing."
  }'
```

### List knowledge notes

```bash theme={null}
curl "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/knowledge/notes" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Update a knowledge note

```bash theme={null}
curl -X PUT "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/knowledge/notes/$NOTE_ID" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coding standards (updated)",
    "trigger": "When writing code in any repository",
    "body": "Use TypeScript strict mode. Follow existing code style. Run lint and type-check before committing."
  }'
```

### Delete a knowledge note

```bash theme={null}
curl -X DELETE "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/knowledge/notes/$NOTE_ID" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Create a playbook

```bash theme={null}
curl -X POST "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/playbooks" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PR Review",
    "instructions": "Review the PR for bugs, security issues, and style violations. Leave inline comments."
  }'
```

### Full Python example

```python theme={null}
import os
import requests

API_KEY = os.environ["DEVIN_API_KEY"]
ORG_ID = os.environ["DEVIN_ORG_ID"]
BASE = "https://api.devin.ai/v3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create knowledge note
note = requests.post(
    f"{BASE}/organizations/{ORG_ID}/knowledge/notes",
    headers=HEADERS,
    json={
        "name": "Coding standards",
        "trigger": "When writing code in any repository",
        "body": "Use TypeScript strict mode. Follow existing code style."
    }
).json()
print(f"Created note: {note['note_id']}")

# List all notes
notes = requests.get(
    f"{BASE}/organizations/{ORG_ID}/knowledge/notes",
    headers={"Authorization": f"Bearer {API_KEY}"}
).json()["items"]
print(f"Total notes: {len(notes)}")

# Create playbook
playbook = requests.post(
    f"{BASE}/organizations/{ORG_ID}/playbooks",
    headers=HEADERS,
    json={
        "name": "PR Review",
        "instructions": "Review the PR for bugs, security issues, and style violations."
    }
).json()
print(f"Created playbook: {playbook['playbook_id']}")
```

***

## Scheduling automated sessions

Create recurring sessions that run on a schedule.

### Create a schedule

```bash theme={null}
curl -X POST "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/schedules" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Run the test suite and report any failures",
    "cron_schedule": "0 9 * * 1-5",
    "timezone": "America/New_York"
  }'
```

This creates a schedule that runs every weekday at 9 AM Eastern.

### List schedules

```bash theme={null}
curl "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/schedules" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Update a schedule

```bash theme={null}
curl -X PATCH "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/schedules/$SCHEDULE_ID" \
  -H "Authorization: Bearer $DEVIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "cron_schedule": "0 8 * * 1-5",
    "is_enabled": true
  }'
```

### Delete a schedule

```bash theme={null}
curl -X DELETE "https://api.devin.ai/v3/organizations/$DEVIN_ORG_ID/schedules/$SCHEDULE_ID" \
  -H "Authorization: Bearer $DEVIN_API_KEY"
```

### Full Python example

```python theme={null}
import os
import requests

API_KEY = os.environ["DEVIN_API_KEY"]
ORG_ID = os.environ["DEVIN_ORG_ID"]
BASE = "https://api.devin.ai/v3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create a daily health check schedule
schedule = requests.post(
    f"{BASE}/organizations/{ORG_ID}/schedules",
    headers=HEADERS,
    json={
        "prompt": "Run the test suite and report any failures",
        "cron_schedule": "0 9 * * 1-5",
        "timezone": "America/New_York"
    }
).json()
print(f"Created schedule: {schedule['schedule_id']}")

# List all schedules
schedules = requests.get(
    f"{BASE}/organizations/{ORG_ID}/schedules",
    headers={"Authorization": f"Bearer {API_KEY}"}
).json()["items"]

for s in schedules:
    status = "enabled" if s.get("is_enabled") else "disabled"
    print(f"  {s['schedule_id']}: {s['cron_schedule']} ({status})")
```

***

## Error handling

All examples above should include error handling in production. Here's a reusable pattern:

```python theme={null}
import requests

def api_request(method, url, headers, **kwargs):
    """Make an API request with standard error handling."""
    response = requests.request(method, url, headers=headers, **kwargs)
    try:
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code
        if status == 401:
            raise Exception("Invalid or expired API key")
        elif status == 403:
            raise Exception("Service user lacks required permission")
        elif status == 404:
            raise Exception("Resource not found")
        elif status == 429:
            raise Exception("Rate limit exceeded — wait and retry")
        else:
            raise Exception(f"API error {status}: {e.response.text}")
```

## Support

<Card title="Need Help?">
  For questions about the API or to report issues, email [support@cognition.ai](mailto:support@cognition.ai)
</Card>


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Session

> Create a new session

## Permissions

Requires a service user with the `ManageOrgSessions` permission at the organization level.

### Additional permissions for advanced features

| Feature             | Required Permission      |
| ------------------- | ------------------------ |
| `create_as_user_id` | `ImpersonateOrgSessions` |

## Devin mode

The `devin_mode` parameter controls which Devin agent mode is used for the session:

| Mode     | Description                                                     |
| -------- | --------------------------------------------------------------- |
| `normal` | The default agent mode. Fast and good at long-horizon planning. |
| `fast`   | \~2x faster, 4x more expensive, same intelligence.              |

When omitted, the session uses the organization's default mode. Fast mode is subject to the same feature flag and enterprise agent preview restrictions as the web app.

## User impersonation

The `create_as_user_id` parameter allows creating a session on behalf of another user. This requires:

1. The service user must have `ImpersonateOrgSessions` permission
2. The target user must be a member of the organization
3. The target user must have `UseDevinSessions` permission


## OpenAPI

````yaml /v3-openapi.yaml POST /v3/organizations/{org_id}/sessions
openapi: 3.1.0
info:
  description: Devin v3 API with Service User authentication and RBAC
  title: Devin API v3
  version: 3.0.0
servers: []
security:
  - bearerAuth: []
paths:
  /v3/organizations/{org_id}/sessions:
    post:
      tags:
        - sessions
      summary: Create Session
      description: Create a new session
      operationId: handle_create_session_v3_organizations__org_id__sessions_post
      parameters:
        - description: 'Organization ID (prefix: org-)'
          in: path
          name: org_id
          required: true
          schema:
            anyOf:
              - type: string
              - type: 'null'
            example: org-abc123def456
            title: Org Id
        - in: query
          name: devin_id
          required: false
          schema:
            anyOf:
              - type: string
              - type: 'null'
            title: Devin Id
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SessionCreateRequest'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionResponse'
          description: Successful Response
        '422':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
          description: Validation Error
components:
  schemas:
    SessionCreateRequest:
      properties:
        attachment_urls:
          anyOf:
            - items:
                format: uri
                maxLength: 2083
                minLength: 1
                type: string
              type: array
            - type: 'null'
          title: Attachment Urls
        bypass_approval:
          anyOf:
            - type: boolean
            - type: 'null'
          title: Bypass Approval
        child_playbook_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Child Playbook Id
        create_as_user_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Create As User Id
        devin_mode:
          anyOf:
            - enum:
                - normal
                - fast
              type: string
            - type: 'null'
          description: >-
            Override the Devin agent mode for the session. 'normal' is the
            default agent mode (fast and good at long-horizon planning). 'fast'
            is ~2x faster, 4x more expensive, same intelligence. Fast mode is
            subject to the same feature flag and enterprise agent preview
            restrictions as the web app.
          title: Devin Mode
        knowledge_ids:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Knowledge Ids
        max_acu_limit:
          anyOf:
            - type: integer
            - type: 'null'
          title: Max Acu Limit
        platform:
          anyOf:
            - type: string
            - type: 'null'
          description: >-
            Override the VM platform for the session (e.g. 'windows'). When
            omitted (or set to 'inherit'), a session created by a parent Devin
            inherits the parent's platform; otherwise the organization default
            is used. Pass 'default' to force the organization default regardless
            of parent. Any other value must match a platform configured for your
            organization (case-insensitive); unrecognized values are rejected
            with a 400 whose error body lists the available platform labels for
            the org.
          title: Platform
        playbook_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Playbook Id
        prompt:
          title: Prompt
          type: string
        repos:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Repos
        secret_ids:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Secret Ids
        session_links:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Session Links
        session_secrets:
          anyOf:
            - items:
                $ref: '#/components/schemas/SessionSecretInput'
              type: array
            - type: 'null'
          title: Session Secrets
        structured_output_required:
          anyOf:
            - type: boolean
            - type: 'null'
          description: >-
            When true (default), the agent MUST call provide_structured_output
            with is_final=true before its turn ends. When false, the tool is
            available but not required — it is not guaranteed to be called in a
            given turn.
          title: Structured Output Required
        structured_output_schema:
          anyOf:
            - additionalProperties: true
              type: object
            - type: 'null'
          description: >-
            JSON Schema (Draft 7) for validating structured output. Max 64KB.
            Must be self-contained (no external $ref).
          title: Structured Output Schema
        tags:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Tags
        title:
          anyOf:
            - type: string
            - type: 'null'
          title: Title
      required:
        - prompt
      title: SessionCreateRequest
      type: object
    SessionResponse:
      properties:
        acus_consumed:
          title: Acus Consumed
          type: number
        category:
          anyOf:
            - enum:
                - bug_fixing
                - ci_cd_and_devops
                - code_quality_and_security
                - code_review_and_analysis
                - data_and_automation
                - documentation_and_content
                - feature_development
                - migrations_and_upgrades
                - other
                - refactoring_and_optimization
                - research_and_exploration
                - unit_test_generation
              type: string
            - type: 'null'
          description: >-
            The session's assigned use-case category, if categorisation has run.
            Only populated on get/list endpoints.
          title: Category
        child_session_ids:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Child Session Ids
        created_at:
          title: Created At
          type: integer
        is_archived:
          default: false
          title: Is Archived
          type: boolean
        org_id:
          title: Org Id
          type: string
        origin:
          anyOf:
            - enum:
                - webapp
                - slack
                - teams
                - api
                - linear
                - jira
                - automation
                - cli
                - desktop
                - other
              type: string
            - type: 'null'
          description: The origin from which the session was created.
          title: Origin
        parent_session_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Parent Session Id
        playbook_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Playbook Id
        pull_requests:
          items:
            $ref: '#/components/schemas/SessionPullRequest'
          title: Pull Requests
          type: array
        service_user_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Service User Id
        session_id:
          title: Session Id
          type: string
        status:
          enum:
            - new
            - claimed
            - running
            - exit
            - error
            - suspended
            - resuming
          title: Status
          type: string
        status_detail:
          anyOf:
            - enum:
                - working
                - waiting_for_user
                - waiting_for_approval
                - finished
                - inactivity
                - user_request
                - usage_limit_exceeded
                - out_of_credits
                - out_of_quota
                - no_quota_allocation
                - payment_declined
                - org_usage_limit_exceeded
                - total_session_limit_exceeded
                - error
              type: string
            - type: 'null'
          description: >-
            Additional detail about the session's current status. When status is
            'running': 'working' (actively working), 'waiting_for_user' (needs
            user input), 'waiting_for_approval' (awaiting action approval in
            safe mode), or 'finished' (task complete). When status is
            'suspended': the reason for suspension such as 'inactivity',
            'user_request', 'usage_limit_exceeded', 'out_of_credits',
            'out_of_quota', 'no_quota_allocation', 'payment_declined',
            'org_usage_limit_exceeded', 'total_session_limit_exceeded', or
            'error'. Only populated on get/list endpoints.
          title: Status Detail
        structured_output:
          anyOf:
            - additionalProperties: true
              type: object
            - type: 'null'
          description: >-
            Validated structured output from the session. Only populated on
            get/list endpoints.
          title: Structured Output
        subcategory:
          anyOf:
            - type: string
            - type: 'null'
          description: >-
            The session's assigned subcategory display name. 'Other' when a
            category is set but no subcategory was assigned or resolved. Only
            populated on get/list endpoints.
          title: Subcategory
        tags:
          items:
            type: string
          title: Tags
          type: array
        title:
          anyOf:
            - type: string
            - type: 'null'
          title: Title
        updated_at:
          title: Updated At
          type: integer
        url:
          title: Url
          type: string
        user_id:
          anyOf:
            - type: string
            - type: 'null'
          title: User Id
      required:
        - session_id
        - url
        - status
        - tags
        - org_id
        - created_at
        - updated_at
        - acus_consumed
        - pull_requests
      title: SessionResponse
      type: object
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          title: Detail
          type: array
      title: HTTPValidationError
      type: object
    SessionSecretInput:
      description: Input model for a session secret provided via API.
      properties:
        key:
          maxLength: 256
          minLength: 1
          title: Key
          type: string
        sensitive:
          default: true
          title: Sensitive
          type: boolean
        value:
          maxLength: 65536
          title: Value
          type: string
      required:
        - key
        - value
      title: SessionSecretInput
      type: object
    SessionPullRequest:
      properties:
        pr_state:
          anyOf:
            - type: string
            - type: 'null'
          title: Pr State
        pr_url:
          title: Pr Url
          type: string
      required:
        - pr_url
        - pr_state
      title: SessionPullRequest
      type: object
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          title: Location
          type: array
        msg:
          title: Message
          type: string
        type:
          title: Error Type
          type: string
      required:
        - loc
        - msg
        - type
      title: ValidationError
      type: object
  securitySchemes:
    bearerAuth:
      description: 'Service User credential (prefix: cog_)'
      scheme: bearer
      type: http

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Session

> Get details of a specific session.

<Note>
  The `devin_id` is the session ID prefixed with `devin-` (e.g., `devin-abc123`).
</Note>

## Permissions

Requires a service user with the `ViewOrgSessions` permission at the organization level.


## OpenAPI

````yaml /v3-openapi.yaml GET /v3/organizations/{org_id}/sessions/{devin_id}
openapi: 3.1.0
info:
  description: Devin v3 API with Service User authentication and RBAC
  title: Devin API v3
  version: 3.0.0
servers: []
security:
  - bearerAuth: []
paths:
  /v3/organizations/{org_id}/sessions/{devin_id}:
    get:
      tags:
        - sessions
      summary: Get Session
      description: Get details of a specific session.
      operationId: handle_get_session_v3_organizations__org_id__sessions__devin_id__get
      parameters:
        - description: 'Devin session ID (prefix: devin-)'
          in: path
          name: devin_id
          required: true
          schema:
            anyOf:
              - type: string
              - type: 'null'
            example: devin-abc123def456
            title: Devin Id
        - description: 'Organization ID (prefix: org-)'
          in: path
          name: org_id
          required: true
          schema:
            anyOf:
              - type: string
              - type: 'null'
            example: org-abc123def456
            title: Org Id
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionResponse'
          description: Successful Response
        '422':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
          description: Validation Error
components:
  schemas:
    SessionResponse:
      properties:
        acus_consumed:
          title: Acus Consumed
          type: number
        category:
          anyOf:
            - enum:
                - bug_fixing
                - ci_cd_and_devops
                - code_quality_and_security
                - code_review_and_analysis
                - data_and_automation
                - documentation_and_content
                - feature_development
                - migrations_and_upgrades
                - other
                - refactoring_and_optimization
                - research_and_exploration
                - unit_test_generation
              type: string
            - type: 'null'
          description: >-
            The session's assigned use-case category, if categorisation has run.
            Only populated on get/list endpoints.
          title: Category
        child_session_ids:
          anyOf:
            - items:
                type: string
              type: array
            - type: 'null'
          title: Child Session Ids
        created_at:
          title: Created At
          type: integer
        is_archived:
          default: false
          title: Is Archived
          type: boolean
        org_id:
          title: Org Id
          type: string
        origin:
          anyOf:
            - enum:
                - webapp
                - slack
                - teams
                - api
                - linear
                - jira
                - automation
                - cli
                - desktop
                - other
              type: string
            - type: 'null'
          description: The origin from which the session was created.
          title: Origin
        parent_session_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Parent Session Id
        playbook_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Playbook Id
        pull_requests:
          items:
            $ref: '#/components/schemas/SessionPullRequest'
          title: Pull Requests
          type: array
        service_user_id:
          anyOf:
            - type: string
            - type: 'null'
          title: Service User Id
        session_id:
          title: Session Id
          type: string
        status:
          enum:
            - new
            - claimed
            - running
            - exit
            - error
            - suspended
            - resuming
          title: Status
          type: string
        status_detail:
          anyOf:
            - enum:
                - working
                - waiting_for_user
                - waiting_for_approval
                - finished
                - inactivity
                - user_request
                - usage_limit_exceeded
                - out_of_credits
                - out_of_quota
                - no_quota_allocation
                - payment_declined
                - org_usage_limit_exceeded
                - total_session_limit_exceeded
                - error
              type: string
            - type: 'null'
          description: >-
            Additional detail about the session's current status. When status is
            'running': 'working' (actively working), 'waiting_for_user' (needs
            user input), 'waiting_for_approval' (awaiting action approval in
            safe mode), or 'finished' (task complete). When status is
            'suspended': the reason for suspension such as 'inactivity',
            'user_request', 'usage_limit_exceeded', 'out_of_credits',
            'out_of_quota', 'no_quota_allocation', 'payment_declined',
            'org_usage_limit_exceeded', 'total_session_limit_exceeded', or
            'error'. Only populated on get/list endpoints.
          title: Status Detail
        structured_output:
          anyOf:
            - additionalProperties: true
              type: object
            - type: 'null'
          description: >-
            Validated structured output from the session. Only populated on
            get/list endpoints.
          title: Structured Output
        subcategory:
          anyOf:
            - type: string
            - type: 'null'
          description: >-
            The session's assigned subcategory display name. 'Other' when a
            category is set but no subcategory was assigned or resolved. Only
            populated on get/list endpoints.
          title: Subcategory
        tags:
          items:
            type: string
          title: Tags
          type: array
        title:
          anyOf:
            - type: string
            - type: 'null'
          title: Title
        updated_at:
          title: Updated At
          type: integer
        url:
          title: Url
          type: string
        user_id:
          anyOf:
            - type: string
            - type: 'null'
          title: User Id
      required:
        - session_id
        - url
        - status
        - tags
        - org_id
        - created_at
        - updated_at
        - acus_consumed
        - pull_requests
      title: SessionResponse
      type: object
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          title: Detail
          type: array
      title: HTTPValidationError
      type: object
    SessionPullRequest:
      properties:
        pr_state:
          anyOf:
            - type: string
            - type: 'null'
          title: Pr State
        pr_url:
          title: Pr Url
          type: string
      required:
        - pr_url
        - pr_state
      title: SessionPullRequest
      type: object
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          title: Location
          type: array
        msg:
          title: Message
          type: string
        type:
          title: Error Type
          type: string
      required:
        - loc
        - msg
        - type
      title: ValidationError
      type: object
  securitySchemes:
    bearerAuth:
      description: 'Service User credential (prefix: cog_)'
      scheme: bearer
      type: http

````
