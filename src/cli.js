#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  isAuthenticationError,
  loginWarningMessage,
  parseLoginCommand,
  reauthenticationMessage,
} from "./auth.js";
import { loadConfig } from "./config.js";
import { CodexAppServerClient, readCodexStatus } from "./codex-client.js";
import { loadState, saveState } from "./state.js";
import {
  deleteTelegramMessage,
  getTelegramUpdates,
  sendTelegramMessage,
} from "./telegram.js";
import { formatUsageMessage, normalizeUsage, usageFingerprint } from "./usage.js";

const command = process.argv[2] || "monitor";
const LOGIN_CONFIRM_WINDOW_MS = 60_000;
const LOGIN_TIMEOUT_MS = 10 * 60_000;
const LOGIN_COOLDOWN_MS = 10 * 60_000;

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

async function sendMessage(config, text, options = {}) {
  return sendTelegramMessage({
    token: config.telegramToken,
    chatId: config.telegramChatId,
    text,
    timeoutMs: config.requestTimeoutMs,
    ...options,
  });
}

async function runTelegramLogin(config, checkUsage, loginState) {
  const client = new CodexAppServerClient({
    command: config.codexCommand,
    timeoutMs: config.requestTimeoutMs,
  });
  let loginId;
  let secretMessageId;

  try {
    await client.start();
    const challenge = await client.startDeviceCodeLogin();
    loginId = challenge?.loginId;
    if (!loginId || !challenge?.verificationUrl || !challenge?.userCode) {
      throw new Error("Codex가 올바른 장치 로그인 정보를 반환하지 않았습니다.");
    }

    const completionPromise = client
      .waitForNotification("account/login/completed", {
        predicate: (params) => params?.loginId === loginId,
        timeoutMs: LOGIN_TIMEOUT_MS,
      })
      .then(
        (value) => ({ value }),
        (error) => ({ error }),
      );

    const secretText = [
      "🔐 Codex 장치 로그인",
      "",
      challenge.verificationUrl,
      `일회용 코드: ${challenge.userCode}`,
      "",
      "⚠️ 이 코드를 누구에게도 전달하지 마세요.",
      "메시지는 로그인 완료 또는 약 10분 후 삭제됩니다.",
    ].join("\n");
    const codeOffset = secretText.indexOf(challenge.userCode);
    const secretMessage = await sendMessage(config, secretText, {
      entities: [
        {
          type: "spoiler",
          offset: codeOffset,
          length: challenge.userCode.length,
        },
      ],
      protectContent: true,
    });
    secretMessageId = secretMessage?.message_id;

    const completionOutcome = await completionPromise;
    if (completionOutcome.error) throw completionOutcome.error;
    const completion = completionOutcome.value;
    if (!completion?.success) {
      throw new Error(completion?.error || "ChatGPT 로그인이 거부되었습니다.");
    }

    await sendMessage(config, "✅ ChatGPT 로그인이 완료되었습니다. 사용량을 다시 확인합니다.");
    try {
      await checkUsage({ forceSend: true });
    } catch (error) {
      await sendMessage(
        config,
        `⚠️ 로그인은 완료됐지만 사용량 조회에 실패했습니다.\n\n${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    if (loginId) await client.cancelLogin(loginId).catch(() => {});
    await sendMessage(
      config,
      `❌ ChatGPT 로그인 실패\n\n${error instanceof Error ? error.message : String(error)}`,
    ).catch(() => {});
  } finally {
    if (secretMessageId) {
      await deleteTelegramMessage({
        token: config.telegramToken,
        chatId: config.telegramChatId,
        messageId: secretMessageId,
        timeoutMs: config.requestTimeoutMs,
      }).catch(() => {});
    }
    await client.close().catch(() => {});
    loginState.active = false;
  }
}

async function telegramCommandLoop(config, checkUsage) {
  let offset;
  const loginState = {
    active: false,
    confirmationExpiresAt: 0,
    nextAllowedAt: 0,
  };

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

        const loginCommand = parseLoginCommand(message?.text);

        if (isStatusCommand(message?.text)) {
          try {
            await checkUsage({ forceSend: true });
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            await sendMessage(
              config,
              isAuthenticationError(error)
                ? reauthenticationMessage(detail)
                : `⚠️ 즉시 조회 실패\n\n${detail}`,
            );
          }
        } else if (loginCommand) {
          if (message?.chat?.type !== "private") {
            await sendMessage(config, "🔒 /login은 보안을 위해 Telegram 개인 채팅에서만 사용할 수 있습니다.");
          } else if (loginCommand === "request") {
            if (loginState.active) {
              await sendMessage(config, "⏳ 이미 ChatGPT 로그인이 진행 중입니다.");
            } else if (Date.now() < loginState.nextAllowedAt) {
              await sendMessage(config, "⏳ 로그인 재시도는 이전 시도 후 10분이 지나야 가능합니다.");
            } else {
              loginState.confirmationExpiresAt = Date.now() + LOGIN_CONFIRM_WINDOW_MS;
              await sendMessage(config, loginWarningMessage());
            }
          } else if (loginState.active) {
            await sendMessage(config, "⏳ 이미 ChatGPT 로그인이 진행 중입니다.");
          } else if (Date.now() > loginState.confirmationExpiresAt) {
            await sendMessage(config, "확인 시간이 만료되었습니다. /login부터 다시 보내세요.");
          } else if (Date.now() < loginState.nextAllowedAt) {
            await sendMessage(config, "⏳ 로그인 재시도는 이전 시도 후 10분이 지나야 가능합니다.");
          } else {
            loginState.active = true;
            loginState.confirmationExpiresAt = 0;
            loginState.nextAllowedAt = Date.now() + LOGIN_COOLDOWN_MS;
            await sendMessage(config, "장치 로그인 정보를 요청하고 있습니다…");
            void runTelegramLogin(config, checkUsage, loginState);
          }
        } else if (isHelpCommand(message?.text)) {
          await sendMessage(
            config,
            [
              "Codex 사용량 알림 봇입니다.",
              "",
              "/status - 지금 사용량 조회",
              "/login - ChatGPT 재로그인 시작(보안 경고 및 확인 필요)",
            ].join("\n"),
          );
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
    const text = isAuthenticationError(error)
      ? reauthenticationMessage(message)
      : `⚠️ Codex 사용량 조회 실패\n\n${message}`;
    await sendMessage(config, text).catch((telegramError) => console.error(telegramError.message));
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
  console.log("Listening for /status and /login through Telegram long polling; no inbound port is open.");
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
