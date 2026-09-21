#!/usr/bin/env node
import { spawn } from "node:child_process";
import { loadConfig } from "./config.js";
import { readCodexStatus } from "./codex-client.js";
import { loadState, saveState } from "./state.js";
import { getTelegramUpdates, sendTelegramMessage } from "./telegram.js";
import { formatUsageMessage, normalizeUsage, usageFingerprint } from "./usage.js";

const command = process.argv[2] || "monitor";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login() {
  const config = loadConfig(process.env, { requireTelegram: false });
  const child = spawn(config.codexCommand, ["login", "--device-auth"], {
    stdio: "inherit",
    env: process.env,
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  if (exitCode !== 0) throw new Error(`Codex login exited with code ${exitCode}`);
}

async function poll(config, { forceSend = false } = {}) {
  const { account, limits } = await readCodexStatus({
    command: config.codexCommand,
    timeoutMs: config.requestTimeoutMs,
  });
  const usage = normalizeUsage(limits);
  const fingerprint = usageFingerprint(usage);
  const state = await loadState(config.stateFile);
  const shouldSend =
    forceSend || config.notifyMode === "always" || state.lastFingerprint !== fingerprint;

  if (shouldSend) {
    await sendTelegramMessage({
      token: config.telegramToken,
      chatId: config.telegramChatId,
      text: formatUsageMessage(usage, { timeZone: config.timeZone }),
      timeoutMs: config.requestTimeoutMs,
    });
  }

  await saveState(config.stateFile, {
    lastFingerprint: fingerprint,
    lastSuccessAt: new Date().toISOString(),
    lastPlanType: account.planType ?? null,
    lastError: null,
  });
  console.log(`Usage checked successfully${shouldSend ? "; notification sent" : "; unchanged"}.`);
}

function createUsageChecker(config) {
  let queue = Promise.resolve();
  return (options) => {
    const job = queue.then(() => poll(config, options));
    queue = job.catch(() => {});
    return job;
  };
}

async function scheduledLoop(config, checkUsage) {
  while (true) {
    try {
      await checkUsage();
    } catch (error) {
      await reportError(config, error);
    }
    await sleep(config.pollIntervalMs);
  }
}

function isStatusCommand(text = "") {
  return /^\/status(?:@\w+)?(?:\s|$)/i.test(text.trim());
}

function isHelpCommand(text = "") {
  return /^\/(?:start|help)(?:@\w+)?(?:\s|$)/i.test(text.trim());
}

async function telegramCommandLoop(config, checkUsage) {
  let offset;
  while (true) {
    try {
      const updates = await getTelegramUpdates({
        token: config.telegramToken,
        offset,
        timeoutSeconds: config.telegramLongPollSeconds,
        requestTimeoutMs: config.requestTimeoutMs,
      });

      for (const update of updates) {
        if (Number.isInteger(update.update_id)) offset = update.update_id + 1;
        const message = update.message;
        if (String(message?.chat?.id) !== config.telegramChatId) continue;

        if (isStatusCommand(message?.text)) {
          try {
            await checkUsage({ forceSend: true });
          } catch (error) {
            await sendTelegramMessage({
              token: config.telegramToken,
              chatId: config.telegramChatId,
              text: `⚠️ 즉시 조회 실패\n\n${error instanceof Error ? error.message : String(error)}`,
              timeoutMs: config.requestTimeoutMs,
            });
          }
        } else if (isHelpCommand(message?.text)) {
          await sendTelegramMessage({
            token: config.telegramToken,
            chatId: config.telegramChatId,
            text: "Codex 사용량 알림 봇입니다.\n\n/status - 지금 사용량 조회",
            timeoutMs: config.requestTimeoutMs,
          });
        }
      }
    } catch (error) {
      console.error(`Telegram command polling failed: ${error.message}`);
      await sleep(5_000);
    }
  }
}

async function reportError(config, error) {
  console.error(error instanceof Error ? error.message : String(error));
  const state = await loadState(config.stateFile).catch(() => ({}));
  const message = error instanceof Error ? error.message : String(error);
  if (state.lastError !== message) {
    await sendTelegramMessage({
      token: config.telegramToken,
      chatId: config.telegramChatId,
      text: `⚠️ Codex 사용량 조회 실패\n\n${message}`,
      timeoutMs: config.requestTimeoutMs,
    }).catch((telegramError) => console.error(telegramError.message));
  }
  await saveState(config.stateFile, {
    ...state,
    lastError: message,
    lastErrorAt: new Date().toISOString(),
  });
}

async function main() {
  if (command === "login") {
    await login();
    return;
  }

  if (!new Set(["monitor", "once"]).has(command)) {
    throw new Error("Usage: node src/cli.js [monitor|once|login]");
  }

  const config = loadConfig();
  if (command === "once") {
    await poll(config, { forceSend: true });
    return;
  }

  console.log(`Monitoring Codex usage every ${config.pollIntervalMs / 60_000} minutes.`);
  console.log("Listening for /status through Telegram long polling; no inbound port is open.");
  const checkUsage = createUsageChecker(config);
  await Promise.all([
    scheduledLoop(config, checkUsage),
    telegramCommandLoop(config, checkUsage),
  ]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
