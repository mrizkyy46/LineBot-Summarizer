# LINE Chat Summarizer

An MVP LINE group-chat summarizer. It receives signed LINE webhook events, keeps recent group text messages in application memory, and responds to `/summary` using Google Gemini through an LLM abstraction.

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
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=your-gemini-model
```

`LLM_PROVIDER` must be `gemini`. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then select a Gemini model available to that key for `LLM_MODEL`. `LLM_TIMEOUT_MS` defaults to `30000` and bounds each summary request. `PORT` defaults to `3000`; `NODE_ENV` defaults to `development`. `MAX_MESSAGES_PER_GROUP` defaults to `500` and limits retained messages for each group. `MAX_SUMMARY_MESSAGES` defaults to `200` and limits the conversation supplied to Gemini.

## Run and test

```bash
npm run dev
npm test
npm run lint
```

`GET /health` returns `{ "status": "ok" }`. Configure LINE's webhook URL as `https://your-public-host/webhook/line`; LINE must be able to reach it over HTTPS.

## Vercel

`src/app.js` exports a default request handler for Vercel and keeps its Express instance warm for the current function instance. In **Vercel → Project → Settings → Environment Variables**, add `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LLM_PROVIDER=gemini`, `LLM_API_KEY`, and `LLM_MODEL` for the required environments, then redeploy. Never expose the Gemini key through a browser variable (for example, `NEXT_PUBLIC_*`). Use `src/server.js` only for local development; Vercel invokes the default export and does not require `app.listen()`.

## Usage and current scope

`POST /webhook/line` uses the official LINE SDK to validate `X-Line-Signature`. It processes text messages from group chats only, stores regular text messages by LINE group ID, and logs event metadata such as IDs and text length—never message text or credentials. Unsupported events are safely ignored.

Send `/summary` in a group after sending one or more normal text messages to request a concise Indonesian summary. The command uses only the recent messages stored for that same LINE group; it does not store the command itself. If no conversation exists, the bot replies `Belum ada cukup percakapan untuk dirangkum.` Gemini failures and timeouts receive a friendly retry message, while the API key and private conversation contents are not logged. Tests inject a mocked Gemini client and never call an external API.

Conversation history is stored only in application memory and will be lost whenever the application restarts.
