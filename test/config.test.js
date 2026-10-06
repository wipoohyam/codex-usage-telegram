import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

test("loads defaults with required Telegram values", () => {
  const config = loadConfig({ TELEGRAM_BOT_TOKEN: "token", TELEGRAM_CHAT_ID: "42" });
  assert.equal(config.pollIntervalMs, 20 * 60_000);
  assert.equal(config.notificationMinIntervalMs, 60 * 60_000);
  assert.equal(config.resetTimeToleranceSeconds, 3 * 60);
  assert.equal(config.primeFullUsage, false);
  assert.equal(config.fullUsagePrimeCooldownMs, 20 * 60_000);
  assert.equal(config.timeZone, "Asia/Seoul");
  assert.equal(config.telegramLongPollSeconds, 50);
});

test("enables optional five-hour priming with configurable safeguards", () => {
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_CHAT_ID: "42",
    PRIME_FULL_USAGE: "true",
    FULL_USAGE_PRIME_COOLDOWN_MINUTES: "30",
    RESET_TIME_TOLERANCE_MINUTES: "4",
  });
  assert.equal(config.primeFullUsage, true);
  assert.equal(config.fullUsagePrimeCooldownMs, 30 * 60_000);
  assert.equal(config.resetTimeToleranceSeconds, 4 * 60);
});

test("rejects missing Telegram values", () => {
  assert.throws(() => loadConfig({}), /TELEGRAM_BOT_TOKEN/);
});

test("login configuration does not require Telegram values", () => {
  const config = loadConfig({}, { requireTelegram: false });
  assert.equal(config.codexCommand, "codex");
});

test("rejects invalid polling interval", () => {
  assert.throws(
    () =>
      loadConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_CHAT_ID: "42",
        POLL_INTERVAL_MINUTES: "zero",
      }),
    /positive number/,
  );
});

test("rejects invalid notification interval", () => {
  assert.throws(
    () =>
      loadConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_CHAT_ID: "42",
        NOTIFICATION_MIN_INTERVAL_MINUTES: "zero",
      }),
    /positive number/,
  );
});
