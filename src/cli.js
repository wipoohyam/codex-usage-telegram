#!/usr/bin/env node
import { spawn } from "node:child_process";
import { loadConfig } from "./config.js";
import { readCodexStatus } from "./codex-client.js";
import { loadState, saveState } from "./state.js";
import { sendTelegramMessage } from "./telegram.js";
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

async function poll(config) {
  const { account, limits } = await readCodexStatus({
    command: config.codexCommand,
    timeoutMs: config.requestTimeoutMs,
  });
  const usage = normalizeUsage(limits);
  const fingerprint = usageFingerprint(usage);
  const state = await loadState(config.stateFile);
  const shouldSend = config.notifyMode === "always" || state.lastFingerprint !== fingerprint;

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
    await poll(config);
    return;
  }

  console.log(`Monitoring Codex usage every ${config.pollIntervalMs / 60_000} minutes.`);
  while (true) {
    try {
      await poll(config);
    } catch (error) {
      await reportError(config, error);
    }
    await sleep(config.pollIntervalMs);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
