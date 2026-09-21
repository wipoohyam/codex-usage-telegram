import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

test("loads defaults with required Telegram values", () => {
  const config = loadConfig({ TELEGRAM_BOT_TOKEN: "token", TELEGRAM_CHAT_ID: "42" });
  assert.equal(config.pollIntervalMs, 90 * 60_000);
  assert.equal(config.timeZone, "Asia/Seoul");
  assert.equal(config.notifyMode, "always");
  assert.equal(config.telegramLongPollSeconds, 50);
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
