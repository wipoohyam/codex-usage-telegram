import { normalizeLanguage, translate } from "./i18n.js";
import { loadState, saveState } from "./state.js";
import { sendTelegramMessage } from "./telegram.js";

export const CODEX_RESETS_STATUS_URL = "https://codex-resets.com/api/v1/status";
export const CODEX_RESETS_SITE_URL = "https://codex-resets.com";

export function scheduledResetFingerprint(reset) {
  return JSON.stringify([reset.id, reset.scheduled_for ?? null, reset.reset_type ?? null]);
}

export function shouldNotifyScheduledReset(reset, state = {}) {
  if (!reset || reset.status !== "scheduled") return false;
  return scheduledResetFingerprint(reset) !== state.lastCodexScheduledResetFingerprint;
}

export async function notifyExternalResets(config, fetchImpl = fetch) {
  let state = await loadState(config.stateFile);
  const result = await fetchResetStatus({
    // Fetch the full response once when upgrading from latest-reset-only tracking.
    etag: state.codexScheduledResetsInitialized ? state.codexResetsEtag : null,
    timeoutMs: config.requestTimeoutMs,
  }, fetchImpl);
  if (result.notModified) return;

  const persist = async (changes) => {
    state = { ...await loadState(config.stateFile), ...changes };
    await saveState(config.stateFile, state);
  };
  const send = (reset, scheduled = false) => sendTelegramMessage({
    token: config.telegramToken,
    chatId: config.telegramChatId,
    timeoutMs: config.requestTimeoutMs,
    text: formatResetAnnouncement(reset, {
      language: normalizeLanguage(state.language),
      timeZone: config.timeZone,
      scheduled,
    }),
  }, fetchImpl);

  if (shouldNotifyNewReset(result.latestReset, state)) {
    await send(result.latestReset);
    await persist({
      lastCodexResetId: result.latestReset.id,
      codexResetsBaselineInitialized: true,
      lastCodexResetNotifiedAt: new Date().toISOString(),
    });
  }
  if (shouldNotifyScheduledReset(result.scheduledReset, state)) {
    await send(result.scheduledReset, true);
    await persist({
      lastCodexScheduledResetFingerprint: scheduledResetFingerprint(result.scheduledReset),
      lastCodexScheduledResetNotifiedAt: new Date().toISOString(),
    });
  }

  // Cache only after all sends succeed, so failed deliveries are retried.
  await persist({
    codexResetsBaselineInitialized: true,
    codexScheduledResetsInitialized: true,
    codexResetsEtag: result.etag,
    lastCodexResetId: result.latestReset?.id ?? state.lastCodexResetId ?? null,
    lastCodexResetCheckedAt: new Date().toISOString(),
  });
}

export function shouldNotifyNewReset(latestReset, state = {}) {
  if (latestReset === null) return false;
  if (state.codexResetsBaselineInitialized === true) {
    return latestReset.id !== state.lastCodexResetId;
  }

  const announcedAt = Date.parse(latestReset.announced_at);
  const lastSuccessAt = Date.parse(state.lastSuccessAt);
  return (
    Number.isFinite(announcedAt) &&
    Number.isFinite(lastSuccessAt) &&
    announcedAt > lastSuccessAt
  );
}

export async function fetchResetStatus(
  { etag = null, timeoutMs = 30_000, url = CODEX_RESETS_STATUS_URL } = {},
  fetchImpl = fetch,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        ...(etag ? { "if-none-match": etag } : {}),
      },
      signal: controller.signal,
    });
    const responseEtag = response.headers.get("etag");
    if (response.status === 304) {
      return { notModified: true, etag: responseEtag || etag, latestReset: null, scheduledReset: null };
    }
    if (!response.ok) {
      throw new Error(`Codex Resets API returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const latestReset = payload?.data?.latest_reset ?? null;
    const scheduledReset = payload?.data?.scheduled_reset ?? null;
    if (
      latestReset !== null &&
      (typeof latestReset !== "object" ||
        typeof latestReset.id !== "string" ||
        latestReset.id.length === 0)
    ) {
      throw new Error("Codex Resets API returned an invalid latest_reset");
    }
    if (
      scheduledReset !== null &&
      (typeof scheduledReset !== "object" ||
        typeof scheduledReset.id !== "string" ||
        scheduledReset.id.length === 0)
    ) {
      throw new Error("Codex Resets API returned an invalid scheduled_reset");
    }
    return { notModified: false, etag: responseEtag, latestReset, scheduledReset };
  } finally {
    clearTimeout(timer);
  }
}

function formatTimestamp(value, timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value || "-");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

export function formatResetAnnouncement(
  reset,
  { language = "ko", timeZone = "Asia/Seoul", scheduled = false } = {},
) {
  const selectedLanguage = normalizeLanguage(language);
  const resetType = translate(
    selectedLanguage,
    reset.reset_type === "banked" ? "externalResetTypeBanked" : "externalResetTypeRegular",
  );
  const text = String(reset.text || "-").trim().slice(0, 2_500);
  const sourceUrl = reset.source?.url || CODEX_RESETS_SITE_URL;
  return translate(selectedLanguage, scheduled ? "externalResetScheduledAlert" : "externalResetAlert", {
    resetType,
    announcedAt: formatTimestamp(reset.announced_at, timeZone),
    scheduledFor: reset.scheduled_for
      ? `${formatTimestamp(reset.scheduled_for, timeZone)} (${timeZone})`
      : translate(selectedLanguage, "unknown"),
    text,
    sourceUrl,
    siteUrl: CODEX_RESETS_SITE_URL,
  });
}
