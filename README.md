# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Telegram bot

Server-side Telegram integration is built into `server/index.js`.

Required environment variables:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_PAYMENT_PROVIDER_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_WEBHOOK_URL=https://justrouter.ru/api/telegram/webhook
LOW_BALANCE_THRESHOLD=100
OPENROUTER_API_KEY=...
OPENROUTER_PROXY_URL=http://user:password@host:port
OPENROUTER_MODEL_MAP={"openai/gpt-5.5":"openai/gpt-4o"}
```

`TELEGRAM_PAYMENT_PROVIDER_TOKEN` is the YooKassa provider token from BotFather payments setup.

`TELEGRAM_WEBHOOK_URL` is optional. If it is not set, the server uses `SITE_URL` and automatically calls Telegram `setWebhook` on startup.

`OPENROUTER_API_KEY` is used by JustRouter server-side routes when a user calls the API with their JustRouter key. `OPENROUTER_PROXY_URL` is optional and applies only to OpenRouter requests. `OPENROUTER_MODEL_MAP` is optional JSON for mapping JustRouter display model ids to real OpenRouter model ids.

Webhook setup example:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://justrouter.ru/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

User flow:

1. The user opens the account page and requests a Telegram link code.
2. The user sends `/connect 123456` to the bot.
3. The bot can show balance with `/balance`, show API key with `/key`, and create a YooKassa invoice with `/topup 500`.

Admin broadcast endpoint:

```bash
POST /api/admin/telegram/broadcast
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "message": "Текст рекламного или продуктового уведомления" }
```

OpenClaw report worker:

```bash
OPENCLAW_REPORT_HOURS=12
OPENCLAW_REPORT_PATH=/
OPENCLAW_REPORT_INTERVAL_MS=43200000
npm run openclaw:report-worker
```

PM2 deploy on server:

```bash
pm2 startOrReload deploy/openclaw.ecosystem.config.cjs --update-env
pm2 save
```

Telegram admin commands after linking an admin account:

- `/openclaw report` - generate and send a fresh 12-hour report.
- `/openclaw latest` - show the latest stored report.
- `/openclaw heatmap /` - show a compact click heatmap for a path.
