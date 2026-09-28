# LINE Chat Summarizer

Phase 1–2 foundation for a LINE group-chat summarizer. It exposes a health endpoint and a signed LINE webhook that accepts text-message events and logs safe metadata only. Message storage and summaries are deliberately not implemented yet.

## Requirements

- Node.js 22 or newer
- A LINE Messaging API channel for external webhook verification

## Setup

```bash
npm install
Copy-Item .env.example .env
```

Set these required values in `.env`:

```env
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
```

`PORT` defaults to `3000`; `NODE_ENV` defaults to `development`.

## Run and test

```bash
npm run dev
npm test
npm run lint
```

`GET /health` returns `{ "status": "ok" }`. Configure LINE's webhook URL as `https://your-public-host/webhook/line`; LINE must be able to reach it over HTTPS.

## Current scope

`POST /webhook/line` uses the official LINE SDK to validate `X-Line-Signature`. It responds with success for signed requests, processes text-message events, and logs event metadata such as IDs and text length—never message text or credentials. Unsupported events are safely ignored.

No database, in-memory message store, LLM integration, or `/summary` command exists in this milestone.

Conversation history is stored only in application memory and will be lost whenever the application restarts. (Message history is not implemented until a later phase.)
