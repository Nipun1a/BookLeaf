# BookLeaf Author Support MVP

A private author and operations workspace for the BookLeaf technical assignment. Authors can inspect their seeded books and royalty balances, submit a query, and follow replies. Admins can triage the queue, use an editable AI suggestion, send a reply, record private notes, and manage status and assignment.

## Run locally

Requires Node.js **22.22 or newer** and npm. The database uses the built-in `node:sqlite` module; Node 22 may emit an experimental-feature warning.

Run these commands in PowerShell from the project folder.

### First-time setup

```powershell
Set-Location 'C:\Users\Nipun\BookLeaf'
node --version
npm --version
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

The environment-file command preserves an existing `.env`. No separate database installation or seed command is needed: the server creates the database and seeds accounts automatically on startup.

### Development mode

```powershell
npm run dev
```

This starts both the React frontend and Express API, with automatic reloads while editing. Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The API runs on port 3001; the frontend proxies `/api` requests to it. Keep the terminal running. Press **Ctrl+C** to stop both processes.

### Build and run the compiled app

Stop development mode first, then run:

```powershell
npm run build
npm start
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). Express serves both the compiled frontend and API. Keep the terminal running and press **Ctrl+C** to stop. After changing frontend code, run `npm run build` again before restarting. On later visits, `npm start` is sufficient if the app has already been built and the code has not changed.

### Tests and command reference

```powershell
npm test
```

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact dependencies from the lockfile |
| `npm run dev` | Run the frontend and API together for development |
| `npm run build` | Check TypeScript and build the frontend into `dist/` |
| `npm start` | Start the API and serve the previously built frontend |
| `npm test` | Run HTTP integration tests and mocked AI provider tests |

Run tests in another terminal if you want to keep the app running. Tests use an in-memory database and do not change the demo database. If port 3001 is already in use, stop the existing BookLeaf server before launching another one.

### Environment configuration

The project works without an AI API key using clearly labeled rules and policy templates. To enable live AI, edit `.env`, set your own `ANTHROPIC_API_KEY`, and restart the server. Do not put API keys in this README.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Express server port; keep this value for the existing development proxy |
| `DATABASE_PATH` | `data/bookleaf.sqlite` | Persistent local SQLite database file |
| `SEED_PASSWORD` | `BookLeaf123!` | Password assigned to accounts when first created |
| `ANTHROPIC_API_KEY` | Empty | Server-side API key; optional for the fallback demo |
| `AI_MODEL` | `claude-haiku-4-5` | Model used for classification and drafts |
| `ANTHROPIC_WORKSPACE_ID` | Empty | Workspace identifier if required by your API key |
| `COOKIE_SECURE` | `false` | Use `true` when deploying behind HTTPS |

The supplied JSON remains unchanged. Startup seeds 10 authors, 18 books, and one admin idempotently; it does not overwrite existing accounts or books. Tickets are created through the application, rather than presented as invented author conversations. A browser verification may leave a clearly marked demo ticket in the local database; it is not part of the seed script.

## Demo accounts

Use the **email address as the login ID**, together with the password below. Internal account IDs identify records; they are not entered in the login form. All seeded accounts use `BookLeaf123!` unless `SEED_PASSWORD` is changed **before first startup**.

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

For a quick walkthrough, log in as Priya, submit a support query, log out, and log in as the admin to manage and reply to it. Log back in as Priya to see the reply. Sneha's account includes a book in production; Kavita's account includes a pending royalty below the payout threshold.

Changing `SEED_PASSWORD` does not change existing passwords. The visible demo account hints are intended for this assignment environment.

## Architecture

React + TypeScript and Vite provide a small single-page frontend. Express exposes a same-origin REST API. SQLite persists users, author profiles, books, sessions, tickets, and messages in `data/bookleaf.sqlite`. Foreign keys enforce relationships; book ownership is checked on ticket creation. Relational fields identify authors and books; supplied, read-only book details remain JSON to retain the exact original records. Book detail JSON is a deliberate MVP trade-off; a larger system should normalize sales and royalty ledgers.

Passwords use salted scrypt hashes. Login issues a random, opaque, 24-hour HttpOnly SameSite=Strict cookie; only its SHA-256 hash is stored. All API routes except login require authentication. Authorization is enforced on the server, including ticket detail, book selection, replies, and notes. Author responses omit private notes and unsent drafts. Cookie mutations reject a conflicting Origin header. Login attempts are limited in memory by IP. This is a single-instance MVP, not a distributed authentication system.

The client polls lists and open conversations every five seconds. Polling keeps the implementation understandable and satisfies near-real-time updates at MVP scale. Unresolved tickets sort ahead of completed ones, then by priority and oldest creation time. Null publication dates, prices, print partners, and payout dates have explicit display states. Zero royalties remain numeric zero.

## AI integration

Set `ANTHROPIC_API_KEY` in `.env` on the server. `AI_MODEL` defaults to `claude-haiku-4-5` and can be changed to a model enabled for your account. Set `ANTHROPIC_WORKSPACE_ID` if required by your key. The implementation follows the [Claude Messages API](https://platform.claude.com/docs/en/api/overview). No keys enter the client bundle.

Claude Haiku is the initial choice for this short classification and drafting workflow; it is configurable rather than embedded in application behavior. No live-provider quality or cost measurements have been made in this workspace. Actual AI behavior still needs validation using a funded API key and representative queries.

New tickets are committed before the AI request. Classification uses a compact taxonomy prompt and validates category/priority against enums. On timeout, rate limit, network failure, or malformed output, a deterministic classifier provides a clearly labeled fallback. A process interruption after insertion can leave a ticket labeled Pending with conservative defaults; admins can still triage it manually. A durable retry job is a production follow-up.

Opening a ticket requests a draft. The prompt includes the original query, the selected book's actual records, the author's name, and only the policy block relevant to the category. It does not include other authors, the whole knowledge base, bank information, or full conversation history. Inputs are explicitly marked as untrusted; the prompt prohibits invented dates, explanations, completed escalations, or payment actions. These prompt rules reduce risk but do not guarantee factual correctness: staff review is required.

Draft output is bounded and cached per ticket; concurrent requests in the same process share the in-flight call. Category changes clear the cached draft. Each request has a 12-second timeout and a 700-token output budget, without automatic retries that could multiply spend. On failure or missing configuration, the admin receives an editable policy template labeled as such. Templates include book facts when relevant. Neither AI nor templates send responses automatically. Ticket drafts are suggestions, and sending a reply does not trigger finance, reprints, or distribution operations.

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

## Validation

`npm run build` checks TypeScript and compiles the frontend. `npm test` exercises real HTTP requests against an in-memory SQLite database: login/logout, seed counts, ownership isolation, invalid book selection and fields, ticket creation, filters, management, draft caching and invalidation, internal-note protection, and cross-origin mutation denial. Provider mocks cover valid AI classification, invalid structured output, 429 responses, and network failure. A browser walkthrough verifies seeded data and the author/admin ticket flow. A real external AI call has not been verified without a configured key.

## Deployment and remaining submission work

The source is ready for a single Node host with a persistent disk. Build with `npm ci && npm run build`; start with `npm start`. Set `PORT` to the platform port and `DATABASE_PATH` to a mounted persistent path. Use HTTPS and `COOKIE_SECURE=true`. Keep one application replica for SQLite and local in-flight coordination. An ephemeral filesystem will lose ticket data. Keep secrets in host environment settings and exclude `.env` and `data/` from source control.

The assignment requests a live URL and a **private** GitHub/GitLab repository; neither is created by this local implementation. Before submission, configure the actual AI key, verify model access and response quality, deploy with persistent storage, verify both roles on the live host, and add the evaluator as a private collaborator when their email is supplied. Do not upload the assignment, source, or sample data to a public repository.

## MVP boundaries

Included: role-based sign-in, all sample books, author tickets, admin triage and replies, private notes, self-assignment, five-second updates, AI integration and fallback, validation, tests, and API documentation.

Deferred: real file uploads (disabled UI explains this), email notifications, signup/password reset, production account provisioning, sales ingestion, actual royalty transfers, reprint/distribution integrations, advanced analytics, distributed rate limiting, durable AI retry jobs, audit logs, and multi-agent assignment. Authors receive replies but do not add follow-up messages in this first version. Rules/templates are a fallback, not a replacement for the evaluated LLM integration. Before serving genuine private data, remove demo hints and establish individual account credentials.
#   B o o k L e a f  
 