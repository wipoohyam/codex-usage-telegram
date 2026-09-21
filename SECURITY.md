# Security Policy

Please do not include Telegram tokens, ChatGPT access tokens, `.env` contents, `auth.json`, or unredacted logs in public issues.

For a suspected vulnerability, use the repository's private security advisory feature. Rotate affected Telegram credentials with BotFather and sign out of Codex to revoke cached ChatGPT credentials.

The `codex-auth` Docker volume must be treated as sensitive because it can contain refreshable ChatGPT credentials.
