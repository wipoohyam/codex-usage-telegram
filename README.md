# Codex Usage Telegram

[English](README.md) | [한국어](README.ko.md)

Self-hosted Telegram notifications for ChatGPT Codex usage limits and earned reset credits. It does not run model turns or require an OpenAI API key.

## Features

- Reports remaining usage and reset times for five-hour, weekly, and other returned windows
- Reports earned reset credits when available
- Checks every 90 minutes by default
- Responds immediately to `/status`
- Alerts when ChatGPT authentication expires
- Supports ChatGPT login and reauthentication from a private Telegram chat
- Supports Korean, English, Chinese, and Japanese notifications
- Requires no public port, webhook, domain, or web server

## Install with Docker Compose

Requirements: Docker Compose and a Telegram bot token from [@BotFather](https://t.me/BotFather).

1. Download the configuration:

   ```sh
   git clone https://github.com/wipoohyam/codex-usage-telegram.git
   cd codex-usage-telegram
   cp .env.example .env
   ```

2. Set your Telegram values in `.env`:

   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_numeric_chat_id
   ```

   To find the chat ID, send the bot a message and open:

   ```text
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

   Use the numeric `message.chat.id`, not the bot username. Never publish or share `.env`.

3. In ChatGPT, open **Settings → Security** and enable **Codex device code authentication**.

4. Pull the image and start the service:

   ```sh
   docker compose pull
   docker compose up -d
   ```

5. Sign in to ChatGPT using either method below.

### Option A: Login from Telegram

In the configured private Telegram chat, send:

```text
/login
```

The bot will show a security warning. To continue, send this within 60 seconds:

```text
/login_confirm
```

The verification URL and one-time code will arrive as separate messages. Tap the spoiler to reveal the code, open the URL, and complete the ChatGPT login.

Login messages are deleted after completion, failure, or approximately ten minutes.

### Option B: Login on the server

For the safer server-side login method, run:

```sh
docker compose run --rm codex-usage login
```

6. Send `/status` to the bot to verify the setup.

## Telegram commands

- `/status` — check usage now
- `/login` — start ChatGPT login or reauthentication and show the security warning
- `/login_confirm` — confirm and continue the login within 60 seconds
- `/language` — choose Korean, English, Chinese, or Japanese (for example, `/language en`)
- `/help` — show available commands

During Telegram login, the verification instructions and one-time code arrive as separate messages. Tap the spoiler to reveal the code, then copy it. Login messages are deleted after completion, failure, or approximately ten minutes.

To change the notification language, send `/language` and then use one of `ko`, `en`, `zh`, or `ja`. The selection is saved in the service state volume.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Required | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Required | Numeric private-chat ID |
| `POLL_INTERVAL_MINUTES` | `90` | Usage check interval |
| `TZ` | `Asia/Seoul` | Time zone used in notifications |
| `NOTIFY_MODE` | `always` | `always` or `changes` |
| `REQUEST_TIMEOUT_SECONDS` | `30` | Request timeout |
| `TELEGRAM_LONG_POLL_SECONDS` | `50` | Telegram command polling duration |

## Operation

Update to the newest image:

```sh
docker compose pull
docker compose up -d --force-recreate
```

Check status and logs:

```sh
docker compose ps
docker compose logs --tail=100 codex-usage
```

Stop and remove the container while keeping login data:

```sh
docker compose down
```

Do not use `docker compose down -v` unless you intend to delete the stored ChatGPT login and application state.

## Security

- ChatGPT credentials remain in the private `codex-auth` Docker volume.
- The Telegram bot token remains in your local `.env` file.
- Only the configured private `TELEGRAM_CHAT_ID` can issue commands.
- A Telegram device code can be copied, forwarded, or captured before automatic deletion. Do not share it.
- Prefer server-side login when possible.

See the official [Codex authentication documentation](https://developers.openai.com/codex/auth).

## License

MIT
