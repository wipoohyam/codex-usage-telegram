import { normalizeLanguage, translate } from "./i18n.js";

function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function windowLabel(minutes, language) {
  const languageCode = normalizeLanguage(language);
  if (languageCode === "en") {
    if (minutes === 300) return "5-hour";
    if (minutes === 10_080) return "Weekly";
    if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080} weeks`;
    if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440} days`;
    if (minutes && minutes % 60 === 0) return `${minutes / 60} hours`;
    return minutes ? `${minutes} minutes` : "Usage";
  }
  if (languageCode === "zh") {
    if (minutes === 300) return "5小时";
    if (minutes === 10_080) return "每周";
    if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080}周`;
    if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440}天`;
    if (minutes && minutes % 60 === 0) return `${minutes / 60}小时`;
    return minutes ? `${minutes}分钟` : "用量";
  }
  if (languageCode === "ja") {
    if (minutes === 300) return "5時間";
    if (minutes === 10_080) return "週間";
    if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080}週`;
    if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440}日`;
    if (minutes && minutes % 60 === 0) return `${minutes / 60}時間`;
    return minutes ? `${minutes}分` : "使用量";
  }
  if (minutes === 300) return "5시간";
  if (minutes === 10_080) return "주간";
  if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080}주`;
  if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440}일`;
  if (minutes && minutes % 60 === 0) return `${minutes / 60}시간`;
  return minutes ? `${minutes}분` : "사용량";
}

function addWindow(output, seen, window, bucketId, kind) {
  if (!window || typeof window !== "object") return;
  const durationMinutes = asFiniteNumber(window.windowDurationMins);
  const usedPercent = asFiniteNumber(window.usedPercent);
  const resetsAt = asFiniteNumber(window.resetsAt);
  if (durationMinutes === null && usedPercent === null && resetsAt === null) return;

  const key = `${bucketId || "default"}:${kind}:${durationMinutes}:${resetsAt}`;
  if (seen.has(key)) return;
  seen.add(key);

  output.push({
    bucketId: bucketId || "codex",
    kind,
    durationMinutes,
    usedPercent,
    remainingPercent:
      usedPercent === null ? null : Math.max(0, Math.min(100, 100 - usedPercent)),
    resetsAt,
    label: windowLabel(durationMinutes),
  });
}

export function normalizeUsage(result = {}) {
  const windows = [];
  const seen = new Set();
  const buckets = result.rateLimitsByLimitId;

  if (buckets && typeof buckets === "object") {
    for (const [bucketId, bucket] of Object.entries(buckets)) {
      addWindow(windows, seen, bucket?.primary, bucketId, "primary");
      addWindow(windows, seen, bucket?.secondary, bucketId, "secondary");
    }
  } else if (result.rateLimits) {
    addWindow(windows, seen, result.rateLimits.primary, result.rateLimits.limitId, "primary");
    addWindow(windows, seen, result.rateLimits.secondary, result.rateLimits.limitId, "secondary");
  }

  windows.sort(
    (a, b) =>
      (a.durationMinutes ?? Number.MAX_SAFE_INTEGER) -
      (b.durationMinutes ?? Number.MAX_SAFE_INTEGER),
  );

  const resetCredits = result.rateLimitResetCredits;
  const availableResetCount = resetCredits
    ? asFiniteNumber(resetCredits.availableCount)
    : null;
  const credits = Array.isArray(resetCredits?.credits)
    ? resetCredits.credits.map((credit) => ({
        id: credit.id ?? null,
        status: credit.status ?? null,
        expiresAt: asFiniteNumber(credit.expiresAt),
        title: credit.title ?? null,
      }))
    : null;

  return { windows, availableResetCount, credits };
}

function formatTimestamp(unixSeconds, timeZone, language) {
  if (unixSeconds === null || unixSeconds === undefined) return translate(language, "unknown");
  const locales = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" };
  return new Intl.DateTimeFormat(locales[normalizeLanguage(language)], {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSeconds * 1_000));
}

function progressBar(percent) {
  if (percent === null) return "──────────";
  const filled = Math.round(Math.max(0, Math.min(100, percent)) / 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

export function formatUsageMessage(
  usage,
  { timeZone = "Asia/Seoul", now = new Date(), language = "ko" } = {},
) {
  const selectedLanguage = normalizeLanguage(language);
  const lines = [translate(selectedLanguage, "usageTitle"), "────────────"];

  if (usage.windows.length === 0) {
    lines.push(translate(selectedLanguage, "noWindows"));
  } else {
    for (const window of usage.windows) {
      const remaining =
        window.remainingPercent === null
          ? translate(selectedLanguage, "unknown")
          : `${Math.round(window.remainingPercent)}%`;
      const label = windowLabel(window.durationMinutes, selectedLanguage);
      lines.push(`${label}  ${progressBar(window.remainingPercent)}  ${remaining}`);
      lines.push(`↻ ${translate(selectedLanguage, "reset")}: ${formatTimestamp(window.resetsAt, timeZone, selectedLanguage)}`);
      lines.push("");
    }
  }

  const resetCount =
    usage.availableResetCount === null
      ? translate(selectedLanguage, "unknown")
      : `${usage.availableResetCount}${
          { ko: "개", en: "", zh: "个", ja: "個" }[selectedLanguage]
        }`;
  lines.push(`${translate(selectedLanguage, "resetCredits")}: ${resetCount}`);
  const expirations = (usage.credits || [])
    .filter((credit) => credit.status === "available" && credit.expiresAt)
    .map((credit) => credit.expiresAt);
  if (expirations.length > 0) {
    lines.push(
      `${translate(selectedLanguage, "nearestExpiry")}: ${formatTimestamp(
        Math.min(...expirations),
        timeZone,
        selectedLanguage,
      )}`,
    );
  }
  lines.push("");
  const locales = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" };
  lines.push(
    `🕒 ${translate(selectedLanguage, "checked")}: ${new Intl.DateTimeFormat(
      locales[selectedLanguage],
      {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      },
    ).format(now)}`,
  );

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n────────────\n${translate(
    selectedLanguage,
    "refreshHint",
  )}`;
}

export function usageFingerprint(usage) {
  return JSON.stringify({
    windows: usage.windows.map((window) => ({
      bucketId: window.bucketId,
      kind: window.kind,
      durationMinutes: window.durationMinutes,
      usedPercent: window.usedPercent,
      resetsAt: window.resetsAt,
    })),
    availableResetCount: usage.availableResetCount,
    credits: usage.credits,
  });
}
