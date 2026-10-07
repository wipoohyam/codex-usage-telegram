import { normalizeLanguage, translate } from "./i18n.js";

export const CODEX_RESETS_STATUS_URL = "https://codex-resets.com/api/v1/status";
export const CODEX_RESETS_SITE_URL = "https://codex-resets.com";

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
      return { notModified: true, etag: responseEtag || etag, latestReset: null };
    }
    if (!response.ok) {
      throw new Error(`Codex Resets API returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const latestReset = payload?.data?.latest_reset ?? null;
    if (
      latestReset !== null &&
      (typeof latestReset !== "object" ||
        typeof latestReset.id !== "string" ||
        latestReset.id.length === 0)
    ) {
      throw new Error("Codex Resets API returned an invalid latest_reset");
    }
    return { notModified: false, etag: responseEtag, latestReset };
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
  { language = "ko", timeZone = "Asia/Seoul" } = {},
) {
  const selectedLanguage = normalizeLanguage(language);
  const resetType = translate(
    selectedLanguage,
    reset.reset_type === "banked" ? "externalResetTypeBanked" : "externalResetTypeRegular",
  );
  const text = String(reset.text || "-").trim().slice(0, 2_500);
  const sourceUrl = reset.source?.url || CODEX_RESETS_SITE_URL;
  return translate(selectedLanguage, "externalResetAlert", {
    resetType,
    announcedAt: formatTimestamp(reset.announced_at, timeZone),
    text,
    sourceUrl,
    siteUrl: CODEX_RESETS_SITE_URL,
  });
}
