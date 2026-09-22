# Security Policy

Please do not include Telegram tokens, ChatGPT access tokens, `.env` contents, `auth.json`, or unredacted logs in public issues.

For a suspected vulnerability, use the repository's private security advisory feature. Rotate affected Telegram credentials with BotFather and sign out of Codex to revoke cached ChatGPT credentials.

The `codex-auth` Docker volume must be treated as sensitive because it can contain refreshable ChatGPT credentials.

The optional Telegram `/login` flow sends a short-lived ChatGPT device code through Telegram. The bot masks it as a spoiler, enables Telegram content protection, and later deletes the message, but these measures are not encryption and cannot prevent screenshots. Device codes are authentication secrets and are susceptible to phishing. Prefer `docker compose run --rm monitor login`; use `/login` only in the configured private chat after reviewing its warning.
