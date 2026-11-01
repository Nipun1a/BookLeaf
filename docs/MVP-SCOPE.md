# Assignment and MVP scope

The provided files are an assignment PDF and a JSON dataset. No separate Word document was present in the workspace.

Build an author support portal for BookLeaf with two interfaces. The central journey is author login → book/account query → AI-assisted admin triage → reviewed reply → author sees the update. This is a support tool, not a full publishing platform.

The assignment permits React/Next/Vue, Node/Python, any suitable database, any LLM provider, and sockets/SSE/polling. No single stack is required. This MVP chooses React and TypeScript, Express, SQLite, Anthropic's configurable Claude API, and polling. SQLite keeps local evaluation simple; PostgreSQL becomes useful when scaling to multiple application instances.

| Priority | Work | Status |
| --- | --- | --- |
| Core | Secure author/admin login and own-data access | Implemented and API tested |
| Core | Seed exact 10 authors and 18 books, including null/zero values | Implemented and checked |
| Core | Author book details and support query form | Implemented and browser checked |
| Core | Author ticket status and replies without refresh | Implemented with five-second polling |
| Core | Queue filters by status/category/priority/date, urgent/old ordering | Implemented and API tested |
| Core | AI category/priority, editable draft with policy/book context | Provider integration implemented; live key needed |
| Core | AI failure fallback and manual replies | Implemented and tested with provider mocks |
| Core | Status changes, classification overrides, notes, self-assignment | Implemented and API tested |
| Submission | README, API reference, one-page approach | Included |
| Submission | Private source repository and evaluator access | Pending repository setup and evaluator email |
| Submission | Live deployment with durable data and AI configuration | Pending hosting setup and API key |
| Bonus | Actual attachment uploads | Deferred; UI explains limitation |

The deadline is five days from receipt, not from a hardcoded calendar date. Evaluation weights: AI integration 25%, architecture/code quality 25%, API design 15%, functionality 15%, product thinking 10%, documentation 10%. Prioritize a reliable ticket journey and policy-grounded AI before extra features. Prepare to explain the code during the 45–60 minute technical discussion.
