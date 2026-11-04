# BookLeaf Assignment 2

This directory contains the native Bubble + n8n royalty dashboard MVP, its exported automation, source-data fixtures and verification tools. Assignment 1 application code is unchanged. The Bubble development app is usable; the live AI integration remains disabled until credentials and transport testing are complete.

## Bubble application

The native Bubble app is `bookleaf-88199`:

- [Editor](https://bubble.io/page?id=bookleaf-88199)
- [Development preview](https://bookleaf-88199.bubbleapps.io/version-test)

Open the development preview in a browser to run Assignment 2. There is no local npm server for this Bubble application. A development preview is not a deployed live app. CSV upload and live deployment are gated by the current Bubble plan; no paid upgrade has been made.

The development database contains the exact 10 Authors, 18 Books and 18 RoyaltySnapshots from the supplied JSON, linked using native Bubble relationships. Author dashboards show own books and earned/paid/pending totals. Admins can search/filter authors, inspect their details and use the notification workspace. The Authors overview includes book counts, earned totals and pending balances. Single and bulk summary actions share a dispatch workflow; sending currently shows **Not configured**.

## Demo logins

All accounts below have been created in the **development** app. Password for every account in this table: `BookLeaf123!`.

| Login email | Role / linked profile |
| --- | --- |
| admin@bookleaf.com | Admin |
| priya.sharma@email.com | Author / Priya Sharma (AUTH001) |
| rohit.kapoor@email.com | Author / Rohit Kapoor (AUTH002) |
| ananya.reddy@email.com | Author / Ananya Reddy (AUTH003) |
| vikram.joshi@email.com | Author / Vikram Joshi (AUTH004) |
| meera.nair@email.com | Author / Meera Nair (AUTH005) |
| arjun.malhotra@email.com | Author / Arjun Malhotra (AUTH006) |
| sneha.kulkarni@email.com | Author / Sneha Kulkarni (AUTH007) |
| farhan.sheikh@email.com | Author / Farhan Sheikh (AUTH008) |
| kavita.deshmukh@email.com | Author / Kavita Deshmukh (AUTH009) |
| diya.chatterjee@email.com | Author / Diya Chatterjee (AUTH010) |

These are assessment-only credentials, not service API keys. Never reuse this password for a real account. New signups are Author-only and unlinked until an administrator assigns the matching profile.

At the owner's explicit request, the four generated accounts remain unchanged: `admin@bookleaf.example.com` is still Admin; `arjun.mehta@quillharbor.example.com` is linked to Meera Nair; `devika.rao@quillharbor.example.com` to Rohit Kapoor; and `meera.kulkarni@quillharbor.example.com` to Priya Sharma. Their passwords are unknown and they are not evaluator logins. Consequently, those three profiles are also accessible to the corresponding generated accounts. No claim is made that only the newly created demo users have access.

## n8n draft and export

The unpublished draft is [BookLeaf royalty summary workflow](https://nipunyug.app.n8n.cloud/assistant/34781b2f-c364-407b-92e7-3660d7547c40), workflow ID `IN9zwQAQp0HeOKqK`. The actual exported workflow is `n8n-royalty-summary.json`. It contains no credential references or pinned simulated AI output and is not an active webhook.

Offline checks execute the exported Code nodes against all original authors:

```powershell
node assignment-2/verify-workflow.mjs
```

These checks verify the exact 18 books and balances, preserved production stages, nine bulk candidates, invalid inputs, mock AI failures and structured-output handling. They do not verify actual HTTP authentication, provider access, callback transport or Bubble behavior. The model defaults to `claude-haiku-4-5`; API account access still needs verification.

Before activation, complete the connection steps below. A missing Anthropic credential is an expected failure, not a completed summary.

## Commands and local prerequisites

Use PowerShell with Node.js and Python 3 installed:

```powershell
Set-Location C:\Users\Nipun\BookLeaf
python assignment-2/prepare_data.py
node assignment-2/verify-workflow.mjs
```

Both tools use standard libraries; no npm install or pip install is required. The preparation command regenerates the local CSVs and request fixtures only; it does not mutate Bubble. The verification command runs offline simulations only; it does not call Anthropic, n8n or Bubble. Import `n8n-royalty-summary.json` through n8n's workflow import UI only when you need another copy; the existing cloud draft is already present.

## Connect the integration when credentials are available

1. In n8n, attach a **Header Auth** credential to `Incoming Royalty Request`: header name `Authorization`, value `Bearer <shared-webhook-secret>`. Put the identical value in Bubble API Connector → BookLeaf n8n → Royalty summary's **private** Authorization header. Do not put it in a readable database field or this README.
2. Attach the Anthropic API credential to `Anthropic Messages API`. The default model is `claude-haiku-4-5`, with a 1,200-token output limit and 60-second timeout. Verify that the supplied Anthropic account can use the model.
3. Configure an authenticated Bubble API credential for `Send Result to Bubble Callback`. Use an admin-authorized API bearer token, stored only in n8n credentials. Leave callback authentication required; do not enable unauthenticated execution.
4. Replace `Workflow Config.bubble_callback_url` with `https://bookleaf-88199.bubbleapps.io/version-test/api/1.1/wf/royalty_summary_result`. This is fixed configuration, never a URL supplied by incoming author data. Any plan restriction on backend API execution must be resolved by the account owner before transport testing.
5. Use n8n's test-webhook listener for controlled pre-publication tests of authentication, one real author request and a matched callback. Confirm 202 is only Processing, generated subject/body appear in the matching log, and duplicate callbacks cannot overwrite terminal results. Test provider failure and callback failure paths. Request fixtures need the notification identifier and request ID stored on an existing Bubble NotificationLog; copy the values displayed in that log. Do not substitute an unrelated Bubble record ID or send a fixture placeholder.
6. Once authentication is configured, publish the n8n workflow to register its production webhook at `https://nipunyug.app.n8n.cloud/webhook/bookleaf-royalty-summary`. Initialize Bubble's connector against the configured endpoint with a controlled test record, then turn on **Enable sending** in Bubble Settings. Keep it off until the connection is ready.
7. Test a single summary, duplicate clicks, and the nine-author pending-balance bulk run. Inspect both successful and failed logs. Actual SMTP delivery is optional and has not been configured.

There are three separate secrets: Anthropic API key, shared inbound webhook secret, and Bubble callback API token. None is included in this export or repository. Creating/entering these credentials and any paid upgrade remain account-owner actions. Development and Live databases are separate; deployment does not copy the development demo accounts or dataset automatically.

## Data preparation

```powershell
python assignment-2/prepare_data.py
```

The script reads the original sample dataset, preserves all figures, validates balances, and creates `data/authors.csv`, `data/books.csv`, `data/royalty-snapshots.csv`, expected totals, and one webhook request fixture per author. No new API key or account password is generated.

Import parent Author records first, then Books, then RoyaltySnapshot records. `AUTH001` and `BK001` are external IDs; Bubble's generated record IDs are different. External ID columns alone do not establish Bubble relationships. Resolve each author/book link after import (or before importing child files, replace the relation column with the matching Bubble record ID). Platform lists use `|` as a delimiter. Null prices and dates are blank; numeric zero remains zero. If CSV import is restricted by the account plan, manually create the 10/18/18 records using these files as the reference.

For a fresh app, create login accounts through Bubble's native account workflows and link each User to the corresponding Author. Do not create ordinary text password fields. Seed data files contain author profiles, not ready-to-use Bubble authentication accounts. The existing development app already has these records and demo logins; do not reimport them blindly.

## Native Bubble schema

| Type | Fields |
| --- | --- |
| User | Native email/password; role (Author/Admin); linked Author |
| Author | External ID, name, email, phone, city, joined date |
| Book | External ID, Author relation, title, ISBN, genre, publication status/date, MRP, royalty/copy, print partner, list of platforms |
| RoyaltySnapshot | Book and Author relations, copies sold, earned, paid, pending, last payout date |
| NotificationLog | Author relation, request ID, status, generated subject/body, requested/completed timestamps, error |

All sensitive data types must deny public access. Authors may search/read only their own linked records; admins may access all required data. Admin actions require server-side role checks. Role changes must not be author-editable.

## Integration contract

Bubble creates a NotificationLog before sending one authenticated webhook per author. Request body: `{request_id, notification_id, author:{author_id,name,email,books:[original book fields]}}`. `notification_id` is the identifier stored on that log and displayed in Notification history; Bubble's internal unique ID is a separate concept. Fixture placeholders must be replaced with the stored identifiers before live testing. Call n8n from Bubble's server using a private API Connector header. Secrets must be stored in service credentials, never in source, custom page states or URL parameters.

n8n acknowledges acceptance with 202, computes totals, requests an AI summary, then calls a fixed authenticated Bubble callback. Callback fields: `request_id`, `notification_id`, `author_id`, `status` (Success/Failed; Bubble also accepts Processing), `subject`, `body`, `completed_at` (ISO timestamp), `error_type`, `error_message`. Callback updates must match the stored request, notification and author IDs. Ignore repeated terminal callbacks. Do not accept an arbitrary callback URL from the webhook payload.

Success means summary text was generated and logged; it does not mean an email was delivered. Actual SMTP delivery is deferred. No live AI call can be verified before an Anthropic credential is configured. No public webhook should be activated before authentication and callback configuration are verified.

Prevent duplicate active notifications for the same author, disable the button while processing, and document the concurrency limits of Bubble's workflow checks. Keep one request ID across retries. A 202 response is not a completion result. The admin UI needs a bounded timeout state and recovery path if the completion callback never arrives.

## Royalty rules and test cases

Published with zero pending is Fully paid. Published with pending and a last payout older than 90 days (or no payout and publication older than 90 days) is Needs review. Other pending books are Pending. Unpublished books show In production. Explain INR 1,000 minimum-payout rollover separately: an age-based badge alone does not establish that a payment is actually overdue.

The source has cumulative balances and one latest payout date, not a full transaction history or quarter allocation. Do not invent transactions, next payout dates, bank data, or delay reasons. Compute totals outside the AI; use the model to explain the figures and quarterly/45-day policy.

Expected Priya totals: earned 19,908; paid 16,338; pending 3,570. Farhan has zero pending. Kavita has 850 pending, below the threshold. Sneha has a production book. Bulk selection includes nine authors, excluding Farhan. Exact expected totals for all authors are in `data/expected-author-totals.csv`.

## Verification and known limits

Verified in the development UI: exact 10/18/18 data counts; all ten approved Author links; admin login; Priya's 19,908/16,338/3,570 totals; Rohit's 84,024/71,000/13,024 totals; own-book lists; Priya denied Rohit's direct book URL; author redirected away from the admin Authors route; fully paid and city filters; nine bulk candidates; Sneha's full Cover Design production stage with blank unpublished fields and zero royalty values. At 390px, the mobile menu opens and My Books navigation works. Public admin provisioning was disabled and its hardcoded setup key removed.

Needs Review backgrounds were corrected to red (`#F8D7D3`) and explicit Pending backgrounds to amber (`#FBE9B0`) in both desktop and card variants of Dashboard, My Books, Authors and Author detail, plus Book detail. Fully Paid retains the green badge. The working admin preview visibly shows the corrected red state. Bubble's AI credits were exhausted during this final pass; these styling edits were made manually in the native editor, without an upgrade.

One controlled click on Priya's **Not configured** summary action created a **Failed** log with exact source totals and an explicit "No request was sent and no email was delivered" explanation. Its stored body is a deterministic local summary, not Anthropic output. Generated setup fixture logs remain labelled as samples and Failed; their old fictional content is not authoritative royalty data.

The exported n8n Code-node simulations passed for all ten authors and eighteen books, malformed inputs and mocked AI failures. Real HTTP credential rejection, provider access, callback delivery, concurrent duplicate dispatch and end-to-end bulk completion are **not yet verified**. Bubble's search-then-create duplicate guard is not an atomic distributed lock. Review behavior under concurrent requests before claiming stronger guarantees. Stalled logs have a 30-minute recovery path and an admin mark-failed action.

No live deployment, real AI generation, SMTP delivery or evaluator editor invitation has been performed. The generated accounts listed above remain at the owner's request. Source balances have historical dates; age badges use the current date, so many pending records now meet Needs Review. Do not change source dates to make a demo look current.

## Assessment handoff

After the live integration passes, provide the preview/live URL appropriate to the assessor, the demo credentials above, Bubble editor access through Bubble's sharing UI, this n8n JSON export and these setup notes. A ZIP of `assignment-2` is a useful artifact bundle, but it cannot replace Bubble editor access or a working app URL. Exclude real credentials and unrelated Assignment 1 build/dependency folders.

Record 3–5 minutes showing: author sign-in and balances; published/production book details; the other-author access denial; admin search/filter and book/earned totals; one real generated summary and log; bulk pending selection; and a brief n8n workflow overview. Show a failure state if time allows. Do not present an offline simulation as a live integration.
