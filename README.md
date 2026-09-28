# LINE Chat Summarizer

An MVP LINE group-chat summarizer. It receives signed LINE webhook events, keeps recent group text messages in application memory, and responds to `/summary` using Groq through an LLM abstraction.

## Setup

Requires Node.js 22 or newer and a LINE Messaging API channel for external webhook verification.

```bash
npm install
```

Copy `.env.example` to `.env`, then set `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, and `LLM_API_KEY`. The LLM settings are `LLM_PROVIDER=groq` and `LLM_MODEL=openai/gpt-oss-20b`. Get a key from the [Groq Console](https://console.groq.com/keys). `LLM_TIMEOUT_MS` defaults to 30000, `MAX_MESSAGES_PER_GROUP` to 500, and `MAX_SUMMARY_MESSAGES` to 200.

## Run and test

```bash
npm run dev
npm test
npm run lint
```

`GET /health` returns `{ "status": "ok" }`. Configure LINE's webhook URL as `https://your-public-host/webhook/line`; LINE must be able to reach it over HTTPS. Send `/summary` in a group after sending ordinary text messages. The bot summarizes recent messages for that group in Indonesian. The command itself is not stored. Groq transient errors (429, 500, 502, 503) are retried with bounded exponential backoff; failures get a friendly LINE response.

## Vercel

`src/app.js` exports a default request handler compatible with Vercel serverless functions; it does not require a persistent process or `app.listen()`. In Vercel Project Settings → Environment Variables, set `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LLM_PROVIDER=groq`, `LLM_API_KEY`, and `LLM_MODEL=openai/gpt-oss-20b`, then redeploy. Keep the Groq key server-side and never expose it through a browser variable.

## Storage limitation

Conversation history is stored only in application memory and will be lost whenever the application restarts.
