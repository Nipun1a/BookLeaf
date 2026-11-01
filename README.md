# BookLeaf Author Support MVP

An author support and communication portal built for the BookLeaf technical assignment. Authors can view their books and royalties, raise support queries, and track responses. The operations team can manage tickets and use AI-assisted classification and editable response drafts grounded in BookLeaf policies.

This MVP focuses on the complete support journey: **author query → admin review → reply → author update**.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Setup and run](#setup-and-run)
- [All demo login credentials](#all-demo-login-credentials)
- [Environment variables](#environment-variables)
- [Demo walkthrough](#demo-walkthrough)
- [Project structure](#project-structure)
- [Architecture and security](#architecture-and-security)
- [AI integration](#ai-integration)
- [REST API](#rest-api)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Deployment and submission](#deployment-and-submission)
- [Known limitations](#known-limitations)

## Features

### Author portal

- Email and password login with access restricted to the signed-in author's data.
- Book details including title, ISBN, genre, publication status and date, MRP, copies sold, royalties earned, paid and pending, last payout, print partner, and distribution channels.
- Support queries linked to an owned book or a general account concern.
- Ticket history, status, original query, and admin responses.
- Automatic updates every five seconds without manually refreshing.
- Explicit empty states and support for books still in production, missing dates, and zero royalties.

### Admin portal

- Ticket queue across all authors, filterable by status, category, priority, and creation date.
- Unresolved tickets ordered by urgency and then oldest first.
- Automatic category and priority suggestions, with manual overrides.
- Editable response drafts based on the query, selected book, and relevant BookLeaf policy.
- Public replies, private internal notes, status changes, and self-assignment.
- Manual handling and labeled policy templates when AI is unavailable.

### Included sample data

The original `bookleaf_sample_data (1).json` seeds **10 authors, 18 books, and one additional admin account**. Startup creates the SQLite database and seeds missing records automatically. Existing accounts, books, and tickets are preserved across restarts. There is no separate migration or seed command.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Responsive author and admin interfaces |
| Backend | Node.js, Express | REST API and compiled frontend hosting |
| Database | SQLite through `node:sqlite` | Persistent accounts, sessions, books, tickets, and messages |
| Validation | Zod | Request validation and AI classification validation |
| Authentication | Node crypto / scrypt and cookie sessions | Password hashing and role-based access |
| AI | Anthropic Claude Messages API | Classification, priority, and response suggestions |
| Updates | Five-second polling | Near-real-time lists and ticket conversations |
| Tests | Node test runner and tsx | API integration and mocked provider tests |

## Requirements

- Node.js **22.22 or newer** with support for `node:sqlite`.
- npm, included with Node.js.
- Internet access for installing dependencies and making live AI requests.
- Optional: an Anthropic API key with access to the configured model.

No PostgreSQL, MongoDB, or separate SQLite installation is required. The app runs without an AI key using clearly labeled fallbacks.

## Setup and run

Run commands from the project root containing `package.json`. The examples below use Windows PowerShell.

### 1. Install dependencies and create the environment file

On the original development machine:

```powershell
Set-Location 'C:\Users\Nipun\BookLeaf'
node --version
npm --version
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

If you received a ZIP or cloned the repository elsewhere, change to that extracted or cloned folder instead. The environment-file command preserves an existing `.env`.

For macOS/Linux, run `npm ci` from the project root and use this environment-file command:

```sh
[ -f .env ] || cp .env.example .env
```

### 2. Start development mode

```powershell
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). This starts the frontend and API together with automatic reloads. The API uses port **3001**, and Vite proxies `/api` requests to it. Keep the terminal running. Press **Ctrl+C** to stop both processes.

### 3. Alternatively, build and run the compiled app

Stop development mode first so that both modes do not compete for port 3001.

```powershell
npm run build
npm start
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). Express serves the compiled frontend and API together. Keep the terminal running; press **Ctrl+C** to stop it.

For later runs, use `npm start` if the frontend has already been built and has not changed. After editing frontend code, build again before restarting.

### Command reference

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile |
| `npm run dev` | Run the frontend and API in development mode |
| `npm run build` | Check TypeScript and compile the frontend into `dist/` |
| `npm start` | Start Express and serve the previously built frontend |
| `npm test` | Run API integration and mocked AI provider tests |

## All demo login credentials

**Enter the email address as the login ID.** Internal IDs identify database records and are not entered in the login form. Both roles use the same sign-in page; the account role determines the portal shown.

| Role | Internal ID | Name | Login ID / email | Password |
| --- | --- | --- | --- | --- |
| Admin | `ADMIN001` | BookLeaf Team | `admin@bookleaf.com` | `BookLeaf123!` |
| Author | `AUTH001` | Priya Sharma | `priya.sharma@email.com` | `BookLeaf123!` |
| Author | `AUTH002` | Rohit Kapoor | `rohit.kapoor@email.com` | `BookLeaf123!` |
| Author | `AUTH003` | Ananya Reddy | `ananya.reddy@email.com` | `BookLeaf123!` |
| Author | `AUTH004` | Vikram Joshi | `vikram.joshi@email.com` | `BookLeaf123!` |
| Author | `AUTH005` | Meera Nair | `meera.nair@email.com` | `BookLeaf123!` |
| Author | `AUTH006` | Arjun Malhotra | `arjun.malhotra@email.com` | `BookLeaf123!` |
| Author | `AUTH007` | Sneha Kulkarni | `sneha.kulkarni@email.com` | `BookLeaf123!` |
| Author | `AUTH008` | Farhan Sheikh | `farhan.sheikh@email.com` | `BookLeaf123!` |
| Author | `AUTH009` | Kavita Deshmukh | `kavita.deshmukh@email.com` | `BookLeaf123!` |
| Author | `AUTH010` | Diya Chatterjee | `diya.chatterjee@email.com` | `BookLeaf123!` |

These are seeded **demo credentials**. All accounts use `BookLeaf123!` unless `SEED_PASSWORD` was changed before they were first created. Changing that variable later does not update existing passwords. Before using genuine author data, replace the shared demo credentials and remove the demo account hints.

Useful accounts for evaluation:

- **Priya Sharma:** published books with royalty balances.
- **Sneha Kulkarni:** published books and a book in cover design.
- **Kavita Deshmukh:** a book in typesetting and a pending royalty below the payout threshold.
- **Admin:** the full ticket queue, book catalog, and management tools.

## Environment variables

Configuration is read from `.env` by the server. Use `.env.example` as the template. Never commit `.env` or put a real API key in this README.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Express port; retain 3001 for the existing development proxy |
| `DATABASE_PATH` | `data/bookleaf.sqlite` | Persistent SQLite database path |
| `SEED_PASSWORD` | `BookLeaf123!` | Password assigned only when seeded accounts are first created |
| `ANTHROPIC_API_KEY` | Empty | Server-only key enabling live AI requests |
| `AI_MODEL` | `claude-haiku-4-5` | Model identifier; must be available to your API account |
| `ANTHROPIC_WORKSPACE_ID` | Empty | Workspace ID if required by the API key |
| `COOKIE_SECURE` | `false` | Keep false for local HTTP; set true for an HTTPS deployment |

To enable AI, add your key to `ANTHROPIC_API_KEY`, confirm the model is enabled for your account, and restart the server. With no key, ticket creation and manual responses still work. Existing cached fallback drafts are not automatically replaced when a key is added; use a new ticket to verify live drafting.

## Demo walkthrough

1. Sign in as `priya.sharma@email.com` using `BookLeaf123!`.
2. Open **My books** and inspect the seeded royalty and sales details.
3. Choose **New support query**, select a book or General / Account level, and submit a subject and description.
4. Log out and sign in as `admin@bookleaf.com` using `BookLeaf123!`.
5. Open the ticket queue and select the new ticket. Review its suggested category, priority, and response draft.
6. Assign the ticket to yourself, set it to **In Progress**, add a private note, edit the suggested response, and send it.
7. Log back in as Priya and open the ticket. The sent reply and current status are visible; the private note and unsent draft are hidden.
8. To check automatic updates, keep the author view open in one browser profile and sign in as admin in another profile or private window. Send an admin reply and allow about five seconds for it to appear in the author view. Ordinary tabs in the same browser profile share the login cookie.

## Project structure

```text
BookLeaf/
├── src/
│   ├── main.tsx                 # React views and API interactions
│   └── style.css                # Responsive styles
├── server/
│   ├── index.ts                 # Startup, seeding, and static hosting
│   ├── app.ts                   # REST routes, authentication, and authorization
│   ├── db.ts                    # SQLite schema, seeding, password helpers
│   ├── ai.ts                    # Prompts, policy context, provider calls, fallbacks
│   └── domain.ts                # Shared types and allowed values
├── tests/api.test.ts            # API and AI failure-path tests
├── docs/
│   ├── APPROACH.md              # Brief implementation write-up
│   └── MVP-SCOPE.md             # Scope and submission checklist
├── bookleaf_sample_data (1).json # Original seed dataset
├── .env.example                # Configuration template
├── Dockerfile                  # Optional container build
├── package.json                # Dependencies and run commands
└── vite.config.ts              # Frontend build and development proxy
```

Runtime records live in `data/bookleaf.sqlite`, which is excluded from source control. Keep the data directory to preserve accounts, sessions, and support conversations. The seed JSON is read at server startup and must remain available.

## Architecture and security

The browser communicates with Express over a same-origin REST API. In development, Vite proxies API calls; in compiled mode, Express serves both frontend assets and API routes. SQLite stores users, author profiles, books, sessions, tickets, and messages. Foreign keys enforce relationships, and book detail JSON retains the exact supplied records. A larger system should normalize sales and royalty ledgers.

Passwords use salted scrypt hashes. Successful login issues a random, opaque 24-hour HttpOnly, SameSite=Strict cookie; the database stores only the session token's SHA-256 hash. All API routes except login require authentication. Authors are restricted to their own books and tickets. Only admins can send responses, write internal notes, change status or classification, and assign tickets.

Author API responses exclude private notes and unsent drafts. Mutating requests reject a conflicting Origin header, and login attempts are limited in memory by IP. These controls are intended for a single-instance MVP. Advanced account lifecycle management and distributed protections are outside the current scope.

## AI integration

The provider implementation uses the [Claude Messages API](https://platform.claude.com/docs/en/api/overview). Claude Haiku is the initial configurable choice for the compact classification and drafting workflow. API keys remain on the backend.

- **Classification:** tickets are saved before external calls. A constrained prompt selects one of six categories and four priorities. Zod validates the returned values. On missing configuration, timeout, rate limit, malformed output, or network failure, a deterministic classifier supplies a labeled fallback.
- **Drafting:** the prompt includes the original query, author's name, selected book's actual data, and only the policy relevant to that category. It excludes unrelated authors and full conversation history. Instructions require empathetic language, clear next steps, and no invented payment dates, bank details, delay reasons, or completed operational actions.
- **Cost control:** requests have a 12-second timeout and a 700-token output limit. Drafts are cached per ticket; concurrent draft requests share one in-flight call within the process. Changing the category invalidates the cached draft. There are no automatic provider retries that multiply usage.
- **Human review:** admins edit drafts before sending. Missing or failed AI produces a labeled policy template, not an automatic reply. Sending text does not execute payouts, reprints, or distribution actions.

The six categories are Royalty & Payments; ISBN & Metadata Issues; Printing & Quality; Distribution & Availability; Book Status & Production Updates; and General Inquiry.

Provider behavior is covered with mocks. **Live AI response quality and model access still require verification with a configured, funded API key.** A process interruption after insertion can leave classification marked Pending with conservative defaults; admins can still triage the ticket manually. Durable retry jobs are deferred.

## REST API

JSON request/response bodies. Successful creates return 201, other successes 200. Errors use `{ "error": "Readable message", "details": [{"field":"...","message":"..."}] }`; details appear for input-validation failures. Common codes: 400 invalid fields, 401 unauthenticated, 403 wrong role or cross-origin mutation, 404 inaccessible/missing ticket, 413 oversized request, 429 login throttling, 500 unexpected failure. `id` values are UUIDs.

| Method | Endpoint | Access | Request and result |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | `{email,password}` → `{user}`, session cookie |
| GET | `/api/auth/me` | Signed in | `{user,aiConfigured}` |
| POST | `/api/auth/logout` | Signed in | Invalidates current session → `{ok:true}` |
| GET | `/api/books` | Signed in | `{books}`; authors see only their own, admins see all |
| GET | `/api/tickets` | Signed in | `{tickets}`; own tickets for authors, all for admin |
| POST | `/api/tickets` | Author | `{book_id:null or owned book ID,subject,description}` → `{id}` |
| GET | `/api/tickets/:id` | Owner/admin | `{ticket,messages,book,authorName}`; private fields removed for authors |
| PATCH | `/api/tickets/:id` | Admin | Any of `{status,category,priority,assigned_to}` → `{ok:true}` |
| POST | `/api/tickets/:id/draft` | Admin | Cached or newly generated suggestion → `{text,source}` |
| POST | `/api/tickets/:id/messages` | Admin | `{body,internal:false}` for author reply; `true` for private note → `{ok:true}` |

List filters: `status`, `category`, `priority`, `from`, `to`. Dates use `YYYY-MM-DD`, inclusive UTC creation dates. Example: `/api/tickets?status=Open&priority=High&from=2026-01-01`.

Status values: Open, In Progress, Resolved, Closed. Priority values: Critical, High, Medium, Low. Assignment values: `me`, `unassigned`. Categories exactly match the assignment's six categories. Subject length: 1–150 trimmed characters; description: 1–5,000; response/note: 1–6,000. JSON bodies are limited to 32 KB.

## Testing

```powershell
npm test
npm run build
```

Tests use an in-memory SQLite database and do not modify the demo database. They exercise login/logout, seeded records, author isolation, invalid inputs, book ownership, ticket creation, filters, admin controls, draft caching/invalidation, private-note protection, and cross-origin request denial. Provider mocks cover valid classification, invalid output, rate limits, and network failures.

The initial MVP passed these checks and a browser walkthrough of author submission, admin response, and author reply visibility. Real-provider testing and deployed-host verification remain separate checks.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `node` or `npm` is not recognized | Install the required Node.js version, then reopen the terminal |
| `node:sqlite` is unavailable | Check `node --version`; use Node.js 22.22 or newer with SQLite support |
| SQLite experimental warning | Node 22 may print this warning; it does not itself mean startup failed |
| Port 3001 is already in use | Stop the existing server with Ctrl+C; run only one local API instance |
| Browser cannot open the app | Keep the terminal running; use port 5173 for development or 3001 after build/start |
| Compiled page is missing or outdated | Run `npm run build`, then `npm start` |
| Sign-in fails | Use the email, not the internal ID; check whether the database was seeded with a custom password |
| Login does not persist on local HTTP | Keep `COOKIE_SECURE=false` locally and use the same hostname consistently |
| AI shows rules or a policy template | Check server environment settings, model access, provider availability, and account funding; restart after changes |
| Old fallback draft remains after enabling AI | Drafts are cached; submit a new test ticket to verify live AI |
| Author/admin tabs change account together | Use separate browser profiles or a private window because ordinary tabs share cookies |
| Tickets disappear after hosting restart | Mount persistent storage and point `DATABASE_PATH` at it |

## Deployment and submission

### Node hosting

Run one application replica with a persistent disk. Install and build with:

```sh
npm ci
npm run build
```

Start with:

```sh
npm start
```

Set `PORT` to the host's assigned port, `DATABASE_PATH` to a mounted persistent path, and `COOKIE_SECURE=true` behind HTTPS. Store the API key in the host's secret/environment settings. An ephemeral filesystem loses ticket records on replacement or restart. The current app needs a Node host; publishing only the static frontend does not provide its API or database.

### Optional Docker workflow

If Docker is installed, run from the project root:

```sh
docker build -t bookleaf-support-mvp .
docker run --rm --name bookleaf-support-mvp -p 3001:3001 --env-file .env -e DATABASE_PATH=/app/data/bookleaf.sqlite -v bookleaf-data:/app/data bookleaf-support-mvp
```

Use the default `PORT=3001` and `COOKIE_SECURE=false` for this local HTTP example. Open [http://127.0.0.1:3001](http://127.0.0.1:3001). The named volume preserves the database. The Docker workflow is provided as an optional deployment path and has not been verified in this workspace.

### Submission checklist

- Verify live AI classification and response quality across all six categories.
- Deploy and test both roles over HTTPS, including persistence after restart.
- Provide the evaluator with the live demo URL and these demo credentials.
- Share a **private** GitHub/GitLab repository and grant evaluator access once their email is provided.
- Include this README and [the brief approach write-up](docs/APPROACH.md).
- If also sending a source ZIP, exclude `.env`, `node_modules/`, local database files under `data/`, and other secrets. Include `.env.example`, the seed JSON, source files, and lockfile.

A deployed demo and private repository have not been created as part of this local build. Keep the assignment, dataset, and solution confidential; do not upload them to a public repository.

## Known limitations

- Attachments have a disabled UI; actual file uploads are deferred.
- Authors can submit queries and read replies but cannot add follow-up messages to an existing ticket.
- No email notifications, signup, password recovery, or production account provisioning.
- No actual payments, sales ingestion, royalty ledger reconciliation, reprint orders, or distribution operations.
- SQLite, draft coordination, and login throttling assume one application instance.
- No durable AI retry queue, immutable audit trail, or advanced analytics.
- AI drafts can be inaccurate and require staff review; fallback rules/templates are not a substitute for verifying the live LLM integration.

See [MVP scope](docs/MVP-SCOPE.md) for the implementation boundaries and [approach](docs/APPROACH.md) for trade-offs and production follow-ups.
