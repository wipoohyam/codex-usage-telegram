# Codex Usage Telegram

[English](README.md) | [한국어](README.ko.md)

Self-hosted Telegram notifications for your ChatGPT Codex usage windows and earned reset credits. Your ChatGPT credentials and Telegram bot token stay on your own host.

The monitor reads account metadata through the official Codex App Server. It does not run a model turn and does not require an OpenAI API key.

## Features

- Reports remaining percentages and reset times for all returned usage windows
- Recognizes five-hour and weekly windows by their duration
- Reports earned reset-credit count and the nearest known expiration
- Polls every 90 minutes by default
- Responds immediately to `/status` through Telegram long polling
- Sends a dedicated reauthentication alert when Codex credentials expire
- Supports a guarded `/login` device-code flow from a private Telegram chat
- Requires no public port, webhook, domain, or web server
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

3. Pull the published image:

   ```sh
   docker compose pull
   ```

   The default image is `wipoohyam/codex-usage-telegram:latest` on Docker Hub. The same image is also published as `ghcr.io/wipoohyam/codex-usage-telegram:latest`.

   To build the same image locally instead, run `docker compose build`.

4. Sign in to ChatGPT with a device code. Enable device-code login in ChatGPT security settings first if necessary:

   ```sh
   docker compose run --rm codex-usage login
   ```

5. Test one notification:

   ```sh
   docker compose run --rm codex-usage once
   ```

6. Start the monitor:

   ```sh
   docker compose up -d
   ```

Send `/status` to your bot whenever you want an immediate report. `/start` and `/help` show the available commands. If the bot previously used a webhook, remove that webhook before using long polling.

### About `docker-compose.yml`

Docker Compose automatically reads the included `docker-compose.yml`:

```yaml
services:
  codex-usage:
    build:
      context: .
    image: ${IMAGE:-wipoohyam/codex-usage-telegram:latest}
    restart: unless-stopped
    env_file:
      - .env
    environment:
      CODEX_HOME: /home/node/.codex
      STATE_FILE: /app/data/state.json
    volumes:
      - codex-auth:/home/node/.codex
      - codex-usage-data:/app/data

volumes:
  codex-auth:
  codex-usage-data:
```

`codex-usage` is the Compose service name, not an official Codex container. The image contains this monitoring application and the Codex CLI. Its internal default command is `monitor`, so normal operation only requires:

```sh
docker compose up -d
```

`docker compose run --rm codex-usage login` is a one-time interactive login command for first setup or expired credentials. `docker compose run --rm codex-usage once` is an optional one-time notification test. Do not set either one as the service's permanent `command`: `login` would prompt again after a restart, while `once` would exit immediately and conflict with the restart policy. The temporary container is removed by `--rm`, but authentication and state remain in the named volumes.

### Telegram login

If authentication expires, the bot sends a reauthentication alert with the safer server-side command. You can also start a device-code login from the configured private chat:

1. Send `/login` and read the security warning.
2. Send `/login_confirm` within 60 seconds. `/login-confirm` and the legacy `/login confirm` form are also accepted.
3. Open the verification URL and enter the one-time code.

Only private chats are allowed. One login can run at a time, attempts have a ten-minute cooldown, and the message containing the device code is shown as a Telegram spoiler with content protection enabled. It is deleted after success, failure, or the ten-minute timeout.

Device codes are sensitive and can be phished. Telegram transports and temporarily stores the code, so the recommended login method remains:

```sh
docker compose run --rm codex-usage login
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
| `TELEGRAM_LONG_POLL_SECONDS` | No | `50` | Telegram command long-poll duration |
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
- Telegram commands use outbound HTTPS long polling. Only the configured `TELEGRAM_CHAT_ID` is accepted.
- Telegram `/login` requires explicit confirmation, only works in a private chat, rate-limits attempts, masks the code as a spoiler, enables Telegram content protection, and deletes the code message when the flow ends.
- A Telegram device-code login is less secure than running the login command on the host; use it only after accepting that the one-time code passes through Telegram.
- Secrets are never included in status messages or application logs.
- `.env`, local state, and Codex authentication paths are ignored by Git.
- Usage monitoring calls read-only account methods. The explicit `/login` flow can update stored authentication, but the application never consumes reset credits.
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
