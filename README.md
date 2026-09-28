# LINE Chat Summarizer

An MVP LINE group-chat summarizer. It receives signed LINE webhook events, keeps recent group text messages in application memory, and responds to `/summary` through an LLM abstraction. The concrete LLM provider remains a later integration step.

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

`PORT` defaults to `3000`; `NODE_ENV` defaults to `development`. `MAX_MESSAGES_PER_GROUP` defaults to `500` and limits retained messages for each group. `MAX_SUMMARY_MESSAGES` defaults to `200` and limits the conversation supplied to the summary service.

## Run and test

```bash
npm run dev
npm test
npm run lint
```

`GET /health` returns `{ "status": "ok" }`. Configure LINE's webhook URL as `https://your-public-host/webhook/line`; LINE must be able to reach it over HTTPS.

## Vercel

`src/app.js` exports a default request handler for Vercel and keeps its Express instance warm for the current function instance. Set the required LINE variables in the Vercel project environment settings. Use `src/server.js` only for local development; Vercel invokes the default export and does not require `app.listen()`.

## Usage and current scope

`POST /webhook/line` uses the official LINE SDK to validate `X-Line-Signature`. It processes text messages from group chats only, stores regular text messages by LINE group ID, and logs event metadata such as IDs and text length—never message text or credentials. Unsupported events are safely ignored.

Send `/summary` in a group to request a concise Indonesian summary of recent stored messages. If no conversation exists, the bot replies `Belum ada cukup percakapan untuk dirangkum.` The LLM provider is intentionally not implemented until Phase 6, so an unconfigured deployment replies with the friendly failure message instead. Tests inject an LLM implementation and never call an external API.

Conversation history is stored only in application memory and will be lost whenever the application restarts.
