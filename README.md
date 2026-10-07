# Codex Usage Telegram

**English** | [한국어](README.ko.md)

A self-hosted Telegram bot that shows your ChatGPT Codex limits and reset times, then alerts you only when something meaningful changes. No OpenAI API key is required.

<p align="center">
  <img src="alarm_message.jpg" alt="Codex usage notifications in Telegram" width="500">
</p>

## What you can do

- Send `/status` to see five-hour, weekly, and other Codex limits
- See exact reset times, countdowns, reset-credit balances, and expirations
- Receive automatic notifications when a displayed limit or reset time changes
- Receive new community reset announcements from [Codex Resets](https://codex-resets.com)
- Renew your ChatGPT login and change notification language from Telegram
- Optionally start an unused five-hour window with a tiny Codex request

Notifications are available in English, Korean, Chinese, and Japanese. The bot uses Telegram long polling, so no inbound port or web server is required.

## Before you install

1. A computer or server with Docker Compose
2. A Telegram bot created with [@BotFather](https://t.me/BotFather)
3. A ChatGPT account with access to Codex

For security, use the bot only in your own private Telegram chat.

## Quick start

### 1. Download the project

```sh
git clone https://github.com/wipoohyam/codex-usage-telegram.git
cd codex-usage-telegram
cp .env.example .env
```

### 2. Find your Telegram chat ID

Send any message to your new bot. Replace `<YOUR_TOKEN>` with the token from BotFather and open this URL:

```text
https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

The number in `message.chat.id` is your private chat ID.

### 3. Configure the bot

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=token_from_BotFather
TELEGRAM_CHAT_ID=your_private_chat_id
```

Never share or commit `.env`; the token grants control of your bot.

### 4. Allow ChatGPT device-code authentication

Open ChatGPT **Settings → Security** and enable **Device code authorization for Codex**.

### 5. Start and sign in

```sh
docker compose pull
docker compose up -d
docker compose run --rm codex-usage login
```

Open the displayed verification URL and enter the device code. Login and notification state live in Docker volumes, so they survive container updates.

Send `/status` to the Telegram bot. If your current Codex limits arrive, setup is complete.

> You can also send `/login` and then `/login_confirm` within 60 seconds. Because this sends a one-time code through Telegram, server-side login is recommended.

## Telegram commands

| Command | What it does |
| --- | --- |
| `/status` | Shows current Codex limits immediately |
| `/language` | Selects English, Korean, Chinese, or Japanese |
| `/prime-on` | Enables five-hour prime |
| `/prime-off` | Disables five-hour prime |
| `/prime-status` | Shows the current prime setting |
| `/login` | Starts ChatGPT login through Telegram |
| `/login_confirm` | Confirms the login request within 60 seconds |
| `/help` | Lists available commands |

## When notifications are sent

By default, the bot checks Codex every 20 minutes.

- A displayed percentage or reset time must change before an automatic usage report is eligible.
- Automatic usage reports are sent at least 60 minutes apart.
- If several changes happen during that hour, only the latest state is sent.
- Reset-time movement of three minutes or less is treated as API jitter.
- While the five-hour balance is exactly 100%, its moving reset time is ignored until usage begins.
- `/status` sends the current state immediately and restarts the automatic-notification interval.

### Community reset announcements

After each successful usage check, the bot queries the public [Codex Resets](https://codex-resets.com) API. It sends one separate alert when the latest reset ID changes. A failure of this external service does not interrupt Codex usage monitoring.

Codex Resets is community-tracked data, not an official OpenAI announcement or commitment.

## Optional five-hour prime

For some accounts, the reset time of an unused five-hour window moves on every check. Prime sends `1+1=?` once when the raw five-hour remaining value is exactly 100%, then refreshes the limits so the real usage window begins.

Enable it with `/prime-on`, or set:

```env
PRIME_FULL_USAGE=true
FULL_USAGE_PRIME_COOLDOWN_MINUTES=20
```

The execution notice looks like this:

```text
⏰ Five-hour remaining: 100.00%
⚡ Prime: sending a 1+1 request to Codex.
```

Prime is disabled by default and consumes a small amount of Codex usage. The bot persists execution state to avoid repeating the request in the same cycle. The default minimum retry interval is 20 minutes. Sending `/prime-on` again clears the saved prime state, so the next check may run it again.

Weekly usage, reset credits, and Codex Resets announcements are not prime conditions.

## Configuration

After editing `.env`, run `docker compose up -d --force-recreate`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `POLL_INTERVAL_MINUTES` | `20` | Codex usage check interval |
| `NOTIFICATION_MIN_INTERVAL_MINUTES` | `60` | Minimum interval between automatic usage reports |
| `RESET_TIME_TOLERANCE_MINUTES` | `3` | Reset-time movement treated as jitter |
| `PRIME_FULL_USAGE` | `false` | Default five-hour prime setting |
| `FULL_USAGE_PRIME_COOLDOWN_MINUTES` | `20` | Minimum prime retry interval |
| `TZ` | `Asia/Seoul` | Time zone used in messages |
| `REQUEST_TIMEOUT_SECONDS` | `30` | Codex, Telegram, and reset API timeout |
| `TELEGRAM_LONG_POLL_SECONDS` | `50` | Telegram command polling duration |
| `CODEX_COMMAND` | `codex` | Codex executable name or path |
| `IMAGE` | `wipoohyam/codex-usage-telegram:latest` | Container image to run |

Changes made with `/prime-on` or `/prime-off` persist across restarts and override the default in `.env`.

## Updates and operation

Update to the latest version:

```sh
git pull
docker compose pull
docker compose up -d --force-recreate
```

View logs:

```sh
docker compose logs --tail=100 codex-usage
```

Pin or roll back by setting an image tag in `.env`:

```env
IMAGE=wipoohyam/codex-usage-telegram:<version>
```

Stop without deleting the saved login and state:

```sh
docker compose down
```

Do not add `-v` unless you intentionally want to delete both Docker volumes. See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Troubleshooting

- **No reply to `/status`:** Make sure you messaged the bot first and that `TELEGRAM_CHAT_ID` is the numeric ID of that private chat, then inspect the logs.
- **ChatGPT login expired:** Run `docker compose run --rm codex-usage login` again.
- **A setting did not apply:** Run `docker compose up -d --force-recreate`.
- **One check timed out:** Wait for the next check or send `/status` again.
- **Only reset announcements fail:** Codex usage monitoring continues when the external Codex Resets API is unavailable.

## Security and stored data

- Do not share `.env` or a device login code.
- Do not add the bot to a public group.
- Prefer server-side login over Telegram login.
- ChatGPT credentials are stored in the `codex-auth` volume.
- Notification state is stored in the `codex-usage-data` volume.
- No inbound network port is opened; Telegram commands use long polling.

See OpenAI's official [Codex authentication documentation](https://developers.openai.com/codex/auth) for authentication details.

## Development and license

```sh
npm test
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contributions and [SECURITY.md](SECURITY.md) for security reports.

MIT License
