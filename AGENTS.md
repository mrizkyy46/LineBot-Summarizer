# LINE Chat Summarizer — Agent Instructions

## 1. Project Overview

Build a LINE Bot that can join LINE group chats, receive text messages through the LINE Messaging API, temporarily store conversation history in application memory, and generate AI-powered summaries when requested by users.

The project is intentionally designed **without a database** for the initial MVP.

The initial goal is:

```text
LINE Group
    ↓
LINE Messaging API
    ↓
Node.js + Express
    ↓
In-Memory Message Store
    ↓
/summary
    ↓
LLM
    ↓
Summary
    ↓
LINE Group
```

The MVP must focus on:

1. Receiving LINE group messages.
2. Storing recent text messages in application memory.
3. Identifying the LINE group and sender.
4. Providing `/summary`.
5. Retrieving recent messages from the current group.
6. Sending the conversation to an LLM.
7. Returning a structured summary to the LINE group.

Do NOT implement a database.

Do NOT implement advanced features unless explicitly requested.

---

# 2. Technology Stack

Use the following stack:

### Runtime

- Node.js
- JavaScript
- ES Modules (`import` / `export`)
- Modern ECMAScript syntax

### HTTP Server

- Express.js

### LINE

- Official LINE Messaging API SDK for Node.js
- LINE Webhook

### Configuration

- dotenv

### Validation

- Zod

### Logging

- Pino

### Testing

- Vitest
- Supertest

### Formatting / Linting

- ESLint
- Prettier

### Containerization

- Docker
- Docker Compose

### Storage

No database.

Use an in-memory message store implemented inside the application.

---

# 3. Important Storage Constraint

This project intentionally does NOT use:

- PostgreSQL
- MySQL
- MongoDB
- SQLite
- Prisma
- TypeORM
- Sequelize
- Redis
- Vector Database

Do not introduce any persistence layer unless explicitly requested.

The message history must be stored in application memory.

Example:

```js
const groupMessages = new Map();
```

The store should be encapsulated behind a dedicated service/module rather than accessed directly throughout the application.

---

# 4. Data Lifetime

Because messages are stored in memory:

```text
Application starts
        ↓
Messages are received
        ↓
Messages stored in memory
        ↓
/summary can access them
        ↓
Application restarts
        ↓
Messages are lost
```

This is expected behavior.

Do not attempt to hide or work around this limitation.

The README must clearly document that message history is lost whenever the application restarts.

---

# 5. Architecture

Use a lightweight modular architecture.

Recommended structure:

```text
src/
├── app.js
├── server.js
│
├── config/
│   ├── env.js
│   └── line.js
│
├── routes/
│   └── line.webhook.js
│
├── controllers/
│   └── line.controller.js
│
├── services/
│   ├── line.service.js
│   ├── chat.service.js
│   ├── message-store.service.js
│   ├── summary.service.js
│   └── llm.service.js
│
├── commands/
│   ├── command-parser.js
│   └── summary.command.js
│
├── prompts/
│   └── summary.prompt.js
│
├── schemas/
│   └── line-event.schema.js
│
├── middlewares/
│   ├── error.middleware.js
│   └── not-found.middleware.js
│
└── utils/
    ├── logger.js
    └── errors.js
```

Tests:

```text
tests/
├── unit/
│   ├── command-parser.test.js
│   ├── message-store.test.js
│   ├── summary.service.test.js
│   └── message-formatter.test.js
│
└── integration/
    ├── health.test.js
    └── webhook.test.js
```

---

# 6. Layer Responsibilities

## Routes

Only define HTTP endpoints.

Example:

```text
POST /webhook/line
GET  /health
```

Do not put business logic inside routes.

---

## Controllers

Responsible for:

- Receiving HTTP requests.
- Passing validated data to services.
- Handling HTTP-level responses.

Controllers must remain thin.

---

## Services

Business logic belongs here.

Examples:

```text
line.service.js
chat.service.js
message-store.service.js
summary.service.js
llm.service.js
```

---

## Message Store

The message store is the replacement for a database in this MVP.

It should provide operations such as:

```js
saveMessage(message);
getMessages(groupId, options);
getMessageCount(groupId);
clearGroup(groupId);
clearAll();
```

The rest of the application must not directly manipulate the underlying `Map`.

---

# 7. In-Memory Message Store

Use a structure similar to:

```text
Map
│
├── groupId
│     │
│     ├── message
│     ├── message
│     └── message
│
└── groupId
      │
      ├── message
      └── message
```

Example conceptual structure:

```js
Map<groupId, Message[]>
```

A message should contain only the information required by the application:

```js
{
  (lineMessageId, groupId, userId, displayName, messageType, text, timestamp);
}
```

Do not store the entire raw LINE webhook payload unless explicitly required.

---

# 8. Message Retention

The in-memory store must have a configurable message limit per group.

Default:

```env
MAX_MESSAGES_PER_GROUP=500
```

When the limit is exceeded:

```text
oldest message
      ↓
removed
```

Example:

```text
500 messages
   ↓
new message
   ↓
remove oldest
   ↓
500 messages
```

This prevents uncontrolled memory growth.

Do not implement unlimited message storage.

---

# 9. Environment Variables

Create `.env.example`.

Expected variables:

```env
NODE_ENV=development
PORT=3000

LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=

MAX_MESSAGES_PER_GROUP=500
MAX_SUMMARY_MESSAGES=200
LLM_TIMEOUT_MS=30000
```

Never commit `.env`.

`.gitignore` must contain:

```text
.env
.env.*
!.env.example
node_modules/
coverage/
```

---

# 10. LINE Webhook

Create:

```text
POST /webhook/line
```

The webhook must:

1. Receive LINE webhook events.
2. Validate the LINE webhook signature.
3. Safely parse events.
4. Ignore unsupported events.
5. Process text messages.
6. Identify the group.
7. Identify the sender.
8. Save the message into the in-memory store.
9. Detect supported commands.
10. Execute the appropriate command.
11. Reply through LINE when required.

---

# 11. Supported LINE Events

For MVP, support:

```text
message
```

Specifically:

```text
message.type === "text"
```

Support group messages:

```text
event.source.type === "group"
```

The application must not crash when receiving:

```text
user events
room events
join events
leave events
follow events
unfollow events
postback events
image messages
video messages
audio messages
file messages
sticker messages
location messages
```

Unsupported events may be ignored safely.

---

# 12. Group Identification

For group messages, use:

```text
event.source.groupId
```

Do not use the group name as the group identifier.

The group name is optional metadata.

Primary identity:

```text
LINE group ID
```

---

# 13. User Identification

Use:

```text
event.source.userId
```

as the user identifier.

Do not rely on `displayName` as a unique identifier.

The message should retain:

```text
userId
displayName
```

so the generated summary can identify participants naturally.

---

# 14. Command System

Implement a simple command parser.

Initial supported command:

```text
/summary
```

Examples:

```text
/summary
```

Future commands may include:

```text
/summary 1h
/summary 3h
/summary today
/summary 2026-09-28
/ask ...
```

Do not implement future commands unless explicitly requested.

The command parser must be independent from the LINE controller.

---

# 15. `/summary`

When a user sends:

```text
/summary
```

the system must:

```text
/summary
   ↓
Identify group
   ↓
Retrieve recent messages
   ↓
Format conversation
   ↓
Generate summary
   ↓
Reply to LINE group
```

Use:

```env
MAX_SUMMARY_MESSAGES=200
```

Do not send unlimited messages to the LLM.

---

# 16. Empty Conversation

If `/summary` is requested but the group does not have enough messages:

Return a friendly response such as:

```text
Belum ada cukup percakapan untuk dirangkum.
```

Do not call the LLM unnecessarily.

---

# 17. Conversation Formatting

Convert stored messages into an LLM-friendly format.

Example:

```text
[2026-09-28 14:10] Andi:
Besok kita deploy aplikasi.

[2026-09-28 14:12] Rizky:
Jam berapa?

[2026-09-28 14:13] Andi:
Jam 20:00.
```

Do not send raw JavaScript objects to the LLM.

---

# 18. LLM Abstraction

Create:

```text
src/services/llm.service.js
```

The rest of the application must not depend directly on a specific LLM provider.

Expose an abstraction similar to:

```js
generateSummary(messages);
```

The provider must be configurable through:

```env
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
```

Do not hardcode API credentials.

Do not hardcode provider-specific logic into `summary.service.js`.

---

# 19. Summary Prompt

The LLM must summarize only information present in the conversation.

Use Indonesian by default.

Required output:

```text
📋 Ringkasan Chat

💬 Topik Utama
• ...

📌 Poin Penting
• ...

✅ Keputusan
• ...

📝 Action Items
• Person — Task — Deadline if mentioned

⏳ Pending
• ...
```

Rules:

- Do not invent facts.
- Do not invent participants.
- Do not invent deadlines.
- Do not infer decisions that were not explicitly made.
- Preserve important dates and numbers.
- Identify action items when explicitly stated.
- Mention the responsible person when clear.
- If a section has no relevant information, state that there is none.
- Keep the summary concise.
- Preserve important technical terms.

---

# 20. LLM Timeout

LLM requests must have a configurable timeout.

Default:

```env
LLM_TIMEOUT_MS=30000
```

If the LLM request times out or fails:

- Log the error internally.
- Do not expose API keys.
- Do not expose stack traces.
- Do not expose provider internals.

Reply:

```text
Maaf, summary sedang gagal dibuat. Silakan coba lagi beberapa saat.
```

---

# 21. LINE Reply

Keep responses readable and concise.

Example:

```text
📋 Ringkasan Chat

💬 Topik Utama
• Deployment aplikasi

📌 Poin Penting
• Deployment direncanakan malam ini.

✅ Keputusan
• Deployment pukul 20:00.

📝 Action Items
• Rizky — melakukan deployment
• Andi — melakukan regression test

⏳ Pending
• Menunggu hasil regression test.
```

If the response becomes too long for LINE:

- Split the message safely, or
- Truncate intelligently.

Do not silently fail.

---

# 22. Security

Security requirements:

- Verify LINE webhook signatures.
- Never expose `LINE_CHANNEL_SECRET`.
- Never expose `LINE_CHANNEL_ACCESS_TOKEN`.
- Never expose `LLM_API_KEY`.
- Validate environment variables at startup.
- Validate incoming event data.
- Do not trust arbitrary webhook payloads.
- Do not log secrets.
- Avoid logging complete private conversations.

---

# 23. Logging

Use Pino.

Log useful metadata such as:

```text
webhook_received
message_received
message_stored
summary_requested
summary_generated
llm_request_failed
```

Example:

```json
{
  "event": "summary_requested",
  "groupId": "Cxxxxxxxx"
}
```

Do not log:

```text
channel secrets
access tokens
LLM API keys
complete private chat history
```

---

# 24. Error Handling

Use centralized error handling.

Expected flow:

```text
Route
 ↓
Controller
 ↓
Service
 ↓
Error
 ↓
Error Middleware
```

Use meaningful application errors where appropriate:

```text
ValidationError
ExternalServiceError
CommandError
```

Do not expose internal error details to LINE users.

---

# 25. Health Check

Implement:

```text
GET /health
```

Example response:

```json
{
  "status": "ok"
}
```

The health check should verify application availability.

Since there is no database, do not implement database health checks.

---

# 26. Testing

Use Vitest and Supertest.

### Unit tests

Test:

- command parser
- message store
- message retention
- message formatter
- summary service
- error handling

### Integration tests

Test:

- `GET /health`
- `POST /webhook/line`
- valid webhook
- unsupported event
- text message
- `/summary`

Mock:

- LINE API
- LLM API

Do not call real external APIs during automated tests.

---

# 27. Docker

Provide:

```text
Dockerfile
docker-compose.yml
```

The initial Docker Compose setup does NOT need PostgreSQL.

The application should be runnable using:

```bash
docker compose up
```

Only the Node.js application is required.

---

# 28. Development Commands

Configure npm scripts similar to:

```json
{
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

Adjust commands if required by the selected dependency versions.

---

# 29. README

Create `README.md`.

Document:

1. Project overview.
2. Architecture.
3. Technology stack.
4. Installation.
5. Environment variables.
6. LINE Developer setup.
7. Webhook configuration.
8. Local development.
9. How to expose the local webhook.
10. `/summary` usage.
11. LLM configuration.
12. Testing.
13. Docker usage.
14. Important limitation of in-memory storage.

Explicitly mention:

> Conversation history is stored only in application memory and will be lost whenever the application restarts.

---

# 30. Development Phases

Do not implement the entire system blindly.

Implement incrementally.

## Phase 1 — Project Foundation

Create:

```text
package.json
src/
.env.example
.gitignore
README.md
```

Implement:

```text
Express
GET /health
configuration
logging
error handling
```

Verify:

```bash
npm test
npm run lint
npm run dev
```

---

## Phase 2 — LINE Webhook

Implement:

```text
LINE SDK
POST /webhook/line
signature validation
event handling
text message detection
```

At this stage:

```text
LINE
 ↓
Webhook
 ↓
Node.js
 ↓
Log metadata
```

Do not implement LLM yet.

---

## Phase 3 — In-Memory Message Store

Implement:

```text
message-store.service.js
```

Requirements:

- Store messages by group ID.
- Limit messages per group.
- Retrieve recent messages.
- Remove oldest messages when the limit is exceeded.
- Provide methods for clearing data.
- Write unit tests.

Expected flow:

```text
LINE message
    ↓
Webhook
    ↓
Message Store
    ↓
Memory
```

---

## Phase 4 — Command System

Implement:

```text
command-parser.js
summary.command.js
```

Support:

```text
/summary
```

Do not implement other commands yet.

---

## Phase 5 — Summary Service

Implement:

```text
summary.service.js
```

Flow:

```text
/summary
    ↓
Message Store
    ↓
Recent messages
    ↓
Conversation formatter
    ↓
LLM Service
    ↓
Summary
    ↓
LINE Reply
```

---

## Phase 6 — LLM Integration

Implement the configured LLM provider.

Requirements:

- timeout
- error handling
- configurable model
- API key from environment
- no credentials in source code

---

## Phase 7 — Testing and Hardening

Verify:

```bash
npm test
npm run lint
```

Test:

```text
health check
webhook
signature validation
message storage
message limit
command parsing
summary generation
LLM failure
empty conversation
unsupported event
```

---

# 31. Explicitly Out of Scope

Do NOT implement the following unless explicitly requested:

```text
❌ PostgreSQL
❌ MySQL
❌ MongoDB
❌ SQLite
❌ Prisma
❌ TypeORM
❌ Sequelize
❌ Redis
❌ Vector Database
❌ RAG
❌ Embeddings
❌ React frontend
❌ Admin dashboard
❌ Authentication portal
❌ OCR
❌ Speech-to-text
❌ Image understanding
❌ File processing
❌ Multi-tenant SaaS
❌ Payment
❌ Subscription
❌ Analytics
```

---

# 32. Future Features

Potential future features include:

```text
/summary 1h
/summary 3h
/summary today
/summary 2026-09-28
/ask <question>
scheduled summary
persistent storage
Redis
PostgreSQL
RAG
embeddings
voice transcription
image understanding
```

These are future possibilities only.

Do not implement them automatically.

---

# 33. Git Practices

Use Conventional Commits.

Examples:

```text
feat(line): add webhook message handling
feat(chat): add in-memory message store
feat(summary): add summary command
feat(llm): integrate summary provider
fix(line): handle unsupported events
fix(chat): enforce message retention limit
test(chat): add message store tests
test(summary): add summary service tests
docs(readme): document in-memory storage
```

Keep commits focused.

Do not mix unrelated changes.

---

# 34. Agent Behavior

Before modifying the project:

1. Inspect the repository.
2. Read existing `AGENTS.md`.
3. Inspect `package.json`.
4. Inspect the existing source structure.
5. Reuse existing code when appropriate.
6. Do not overwrite existing code without understanding it.

For every implementation:

```text
Understand
    ↓
Plan
    ↓
Implement
    ↓
Test
    ↓
Lint
    ↓
Review
```

Do not claim a feature works without verifying it.

If an external credential is unavailable:

Clearly distinguish:

```text
Implemented
```

from:

```text
Not externally verified
```

Never create fake credentials or mock successful external API results as if they were real.

---

# 35. First Task

Start by inspecting the repository.

Then implement **Phase 1 and Phase 2 only**.

The first milestone is:

```text
Express Server
       ↓
GET /health
       ↓
LINE Webhook
       ↓
Signature Validation
       ↓
Receive Text Message
       ↓
Log Safe Metadata
       ↓
Successful Webhook Response
```

Do NOT implement:

- database
- Prisma
- PostgreSQL
- message persistence
- LLM
- `/summary`

Those will be implemented in later phases.

After completing the task, report:

1. Files created.
2. Files modified.
3. Dependencies added.
4. How to run the project.
5. Required environment variables.
6. Tests executed and their results.
7. Lint result.
8. Which parts require real LINE credentials for external verification.
