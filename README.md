# Codex Usage Telegram

Self-hosted Telegram notifications for your ChatGPT Codex usage windows and earned reset credits. Your ChatGPT credentials and Telegram bot token stay on your own host.

The monitor reads account metadata through the official Codex App Server. It does not run a model turn and does not require an OpenAI API key.

## Features

- Reports remaining percentages and reset times for all returned usage windows
- Recognizes five-hour and weekly windows by their duration
- Reports earned reset-credit count and the nearest known expiration
- Polls every 90 minutes by default
- Sends every report, or only changed reports
- Suppresses duplicate error notifications
- Stores ChatGPT authentication in a private Docker volume
- Uses only Node.js built-ins at runtime

## Quick start with Docker Compose

Requirements: Docker Compose and a Telegram bot token from [@BotFather](https://t.me/BotFather).

1. Clone this repository and create the configuration file:

   ```sh
   cp .env.example .env
   ```

2. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`. To discover your chat ID, send your bot a message and open:

   ```text
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

3. Build the image:

   ```sh
   docker compose build
   ```

4. Sign in to ChatGPT with a device code. Enable device-code login in ChatGPT security settings first if necessary:

   ```sh
   docker compose run --rm monitor login
   ```

5. Test one notification:

   ```sh
   docker compose run --rm monitor once
   ```

6. Start the monitor:

   ```sh
   docker compose up -d
   ```

The `codex-auth` volume contains access tokens. Treat it like a password, do not publish it, and protect host backups.

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | — | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Yes | — | Destination chat or channel ID |
| `POLL_INTERVAL_MINUTES` | No | `90` | Successful and failed poll interval |
| `TZ` | No | `Asia/Seoul` | IANA time zone used in messages |
| `NOTIFY_MODE` | No | `always` | `always` or `changes` |
| `REQUEST_TIMEOUT_SECONDS` | No | `30` | Codex and Telegram request timeout |
| `CODEX_COMMAND` | No | `codex` | Codex executable path |
| `STATE_FILE` | No | `data/state.json` | Local deduplication state |

## Run without Docker

Install Node.js 20+ and the Codex CLI, then run:

```sh
npm install --global @openai/codex
cp .env.example .env
codex login --device-auth
```

Load the variables from `.env` using your shell or service manager, then use `npm start`. This project deliberately does not parse `.env` itself so it can remain dependency-free.

## Security model

- The app-server uses local JSONL over standard input/output; it is not exposed on a network port.
- Secrets are never included in status messages or application logs.
- `.env`, local state, and Codex authentication paths are ignored by Git.
- The application only calls read-only account methods. It does not consume reset credits.
- The Docker container runs as the unprivileged `node` user.

Codex may store authentication in `auth.json` when an OS credential store is unavailable. Protect the Docker volume accordingly. See the [official authentication documentation](https://learn.chatgpt.com/docs/auth#credential-storage).

## Development

```sh
npm run check
npm test
docker build -t codex-usage-telegram:test .
```

## Disclaimer

This is an independent open-source project and is not affiliated with or endorsed by OpenAI or Telegram. Codex App Server schemas can evolve; pin image versions and review releases before upgrading.

## License

MIT
