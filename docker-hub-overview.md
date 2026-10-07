# Codex Usage Telegram

A self-hosted Telegram bot for ChatGPT Codex usage limits, reset times, reset credits, and community reset announcements. No OpenAI API key or inbound port is required.

## What you get

- Five-hour, weekly, and other Codex limits in Telegram
- Exact reset times and remaining-time countdowns
- Automatic reports only when a displayed value meaningfully changes
- New reset announcements from [Codex Resets](https://codex-resets.com)
- English, Korean, Chinese, and Japanese notifications
- ChatGPT reauthentication from the server or Telegram
- Optional five-hour prime for initializing an unused reset window
- Persistent login and notification state in Docker volumes

## Quick start

```sh
git clone https://github.com/wipoohyam/codex-usage-telegram.git
cd codex-usage-telegram
cp .env.example .env
```

Create a Telegram bot with [@BotFather](https://t.me/BotFather), send it a message, and open:

```text
https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

Copy `message.chat.id`, then set these values in `.env`:

```env
TELEGRAM_BOT_TOKEN=token_from_BotFather
TELEGRAM_CHAT_ID=your_private_chat_id
```

Enable **Device code authorization for Codex** in ChatGPT **Settings → Security**, then run:

```sh
docker compose pull
docker compose up -d
docker compose run --rm codex-usage login
```

Send `/status` to the bot to see your current limits.

## Telegram commands

| Command | Purpose |
| --- | --- |
| `/status` | Show current Codex limits now |
| `/language` | Select English, Korean, Chinese, or Japanese |
| `/prime-on` | Enable five-hour prime |
| `/prime-off` | Disable five-hour prime |
| `/prime-status` | Show the prime setting |
| `/login` | Start ChatGPT login through Telegram |
| `/login_confirm` | Confirm the login request within 60 seconds |
| `/help` | List commands |

## Notification behavior

The bot checks every 20 minutes by default. Automatic usage reports require a changed percentage or reset time and are sent at least 60 minutes apart. Reset-time movement within three minutes is treated as API jitter.

After each successful usage check, the bot also checks [Codex Resets](https://codex-resets.com). A new reset ID produces one separate alert. This is community-tracked data, not an official OpenAI announcement. Failure of that external API does not interrupt Codex usage monitoring.

## Optional five-hour prime

Prime is disabled by default. When enabled, it sends a small `1+1=?` request if the raw five-hour remaining value is exactly 100%, then refreshes the limits.

```env
PRIME_FULL_USAGE=true
FULL_USAGE_PRIME_COOLDOWN_MINUTES=20
```

It consumes a small amount of Codex usage. Weekly usage, reset credits, and community reset announcements are not prime conditions.

## Update

```sh
git pull
docker compose pull
docker compose up -d --force-recreate
```

The `codex-auth` and `codex-usage-data` volumes preserve login and state across updates. Do not run `docker compose down -v` unless you intend to delete them.

## Documentation

- [Full English guide](https://github.com/wipoohyam/codex-usage-telegram/blob/main/README.md)
- [한국어 사용 설명서](https://github.com/wipoohyam/codex-usage-telegram/blob/main/README.ko.md)
- [Changelog](https://github.com/wipoohyam/codex-usage-telegram/blob/main/CHANGELOG.md)
- [Releases](https://github.com/wipoohyam/codex-usage-telegram/releases)

MIT License
