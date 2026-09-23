#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  isAuthenticationError,
  loginWarningMessage,
  parseLanguageCommand,
  parseLoginCommand,
  reauthenticationMessage,
} from "./auth.js";
import { loadConfig } from "./config.js";
import { CodexAppServerClient, readCodexStatus } from "./codex-client.js";
import { loadState, saveState } from "./state.js";
import { normalizeLanguage, translate } from "./i18n.js";
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
      text: formatUsageMessage(usage, {
        timeZone: config.timeZone,
        language: normalizeLanguage(state.language),
      }),
      timeoutMs: config.requestTimeoutMs,
    });
  }

  const latestState = await loadState(config.stateFile);
  await saveState(config.stateFile, {
    ...latestState,
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

async function runTelegramLogin(config, checkUsage, loginState, language) {
  const client = new CodexAppServerClient({
    command: config.codexCommand,
    timeoutMs: config.requestTimeoutMs,
  });
  let loginId;
  const protectedMessageIds = [];

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

    const instructionMessage = await sendMessage(
      config,
      [
        "🔐 Codex 장치 로그인",
        "",
        challenge.verificationUrl,
        "",
        translate(language, "loginInstruction"),
        translate(language, "loginCodeWarning"),
        translate(language, "loginDeleteNotice"),
      ].join("\n"),
      { protectContent: true },
    );
    if (instructionMessage?.message_id) {
      protectedMessageIds.push(instructionMessage.message_id);
    }

    const codeMessage = await sendMessage(config, challenge.userCode, {
      entities: [{ type: "spoiler", offset: 0, length: challenge.userCode.length }],
    });
    if (codeMessage?.message_id) protectedMessageIds.push(codeMessage.message_id);

    const completionOutcome = await completionPromise;
    if (completionOutcome.error) throw completionOutcome.error;
    const completion = completionOutcome.value;
    if (!completion?.success) {
      throw new Error(completion?.error || "ChatGPT 로그인이 거부되었습니다.");
    }

    await sendMessage(config, translate(language, "loginSuccess"));
    try {
      await checkUsage({ forceSend: true });
    } catch (error) {
      await sendMessage(
        config,
        translate(language, "loginUsageFailure", {
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  } catch (error) {
    if (loginId) await client.cancelLogin(loginId).catch(() => {});
    await sendMessage(
      config,
      translate(language, "loginFailure", {
        detail: error instanceof Error ? error.message : String(error),
      }),
    ).catch(() => {});
  } finally {
    await Promise.all(
      protectedMessageIds.map((messageId) =>
        deleteTelegramMessage({
          token: config.telegramToken,
          chatId: config.telegramChatId,
          messageId,
          timeoutMs: config.requestTimeoutMs,
        }).catch(() => {}),
      ),
    );
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

        const state = await loadState(config.stateFile);
        const language = normalizeLanguage(state.language);
        const languageCommand = parseLanguageCommand(message?.text);
        const loginCommand = parseLoginCommand(message?.text);

        if (languageCommand) {
          if (!languageCommand.valid) {
            await sendMessage(config, translate(language, "languageInvalid"));
          } else if (!languageCommand.value) {
            await sendMessage(config, translate(language, "languageMenu", { current: language }));
          } else {
            const nextLanguage = normalizeLanguage(languageCommand.value);
            await saveState(config.stateFile, { ...state, language: nextLanguage });
            await sendMessage(config, translate(nextLanguage, "languageChanged", { language: nextLanguage }));
          }
        } else if (isStatusCommand(message?.text)) {
          try {
            await checkUsage({ forceSend: true });
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            await sendMessage(
              config,
              isAuthenticationError(error)
                ? reauthenticationMessage(detail, language)
                : translate(language, "statusFailure", { detail }),
            );
          }
        } else if (loginCommand) {
          if (message?.chat?.type !== "private") {
            await sendMessage(config, translate(language, "loginPrivateOnly"));
          } else if (loginCommand === "request") {
            if (loginState.active) {
              await sendMessage(config, translate(language, "loginActive"));
            } else if (Date.now() < loginState.nextAllowedAt) {
              await sendMessage(config, translate(language, "loginCooldown"));
            } else {
              loginState.confirmationExpiresAt = Date.now() + LOGIN_CONFIRM_WINDOW_MS;
              await sendMessage(config, loginWarningMessage(language));
            }
          } else if (loginState.active) {
            await sendMessage(config, translate(language, "loginActive"));
          } else if (Date.now() > loginState.confirmationExpiresAt) {
            await sendMessage(config, translate(language, "loginExpired"));
          } else if (Date.now() < loginState.nextAllowedAt) {
            await sendMessage(config, translate(language, "loginCooldown"));
          } else {
            loginState.active = true;
            loginState.confirmationExpiresAt = 0;
            loginState.nextAllowedAt = Date.now() + LOGIN_COOLDOWN_MS;
            await sendMessage(config, translate(language, "loginRequesting"));
            void runTelegramLogin(config, checkUsage, loginState, language);
          }
        } else if (isHelpCommand(message?.text)) {
          await sendMessage(config, translate(language, "help"));
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
    const language = normalizeLanguage(state.language);
    const text = isAuthenticationError(error)
      ? reauthenticationMessage(message, language)
      : translate(language, "statusFailure", { detail: message });
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
