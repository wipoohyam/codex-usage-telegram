# Security Policy

Please do not include Telegram tokens, ChatGPT access tokens, `.env` contents, `auth.json`, or unredacted logs in public issues.

For a suspected vulnerability, use the repository's private security advisory feature. Rotate affected Telegram credentials with BotFather and sign out of Codex to revoke cached ChatGPT credentials.

The `codex-auth` Docker volume must be treated as sensitive because it can contain refreshable ChatGPT credentials.

The optional Telegram `/login` flow sends a short-lived ChatGPT device code through Telegram as a copyable spoiler message and later deletes it. The code deliberately does not use Telegram content protection so it can be copied after revealing it. Deletion is not encryption or recall: recipients can copy, forward, or capture the code first. Device codes are authentication secrets and are susceptible to phishing. Prefer `docker compose run --rm codex-usage login`; use `/login` only in the configured private chat after reviewing its warning.
