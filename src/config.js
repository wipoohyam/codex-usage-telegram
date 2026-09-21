import path from "node:path";

function positiveNumber(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

export function loadConfig(env = process.env, { requireTelegram = true } = {}) {
  const telegramToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const telegramChatId = env.TELEGRAM_CHAT_ID?.trim();

  if (requireTelegram && !telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  if (requireTelegram && !telegramChatId) {
    throw new Error("TELEGRAM_CHAT_ID is required");
  }

  const notifyMode = (env.NOTIFY_MODE || "always").trim().toLowerCase();
  if (!new Set(["always", "changes"]).has(notifyMode)) {
    throw new Error("NOTIFY_MODE must be either 'always' or 'changes'");
  }

  const timeZone = (env.TZ || "Asia/Seoul").trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`TZ is not a valid IANA time zone: ${timeZone}`);
  }

  return {
    telegramToken,
    telegramChatId,
    pollIntervalMs:
      positiveNumber(env.POLL_INTERVAL_MINUTES, 90, "POLL_INTERVAL_MINUTES") * 60_000,
    requestTimeoutMs:
      positiveNumber(env.REQUEST_TIMEOUT_SECONDS, 30, "REQUEST_TIMEOUT_SECONDS") * 1_000,
    telegramLongPollSeconds: positiveNumber(
      env.TELEGRAM_LONG_POLL_SECONDS,
      50,
      "TELEGRAM_LONG_POLL_SECONDS",
    ),
    timeZone,
    notifyMode,
    codexCommand: (env.CODEX_COMMAND || "codex").trim(),
    stateFile: path.resolve(env.STATE_FILE || "data/state.json"),
  };
}
