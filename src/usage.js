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
    if (minutes === 10_080) return "每 周";
    if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080}周`;
    if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440}天`;
    if (minutes && minutes % 60 === 0) return `${minutes / 60}小时`;
    return minutes ? `${minutes}分钟` : "用量";
  }
  if (languageCode === "ja") {
    if (minutes === 300) return "5時間";
    if (minutes === 10_080) return "週 間";
    if (minutes && minutes % 10_080 === 0) return `${minutes / 10_080}週`;
    if (minutes && minutes % 1_440 === 0) return `${minutes / 1_440}日`;
    if (minutes && minutes % 60 === 0) return `${minutes / 60}時間`;
    return minutes ? `${minutes}分` : "使用量";
  }
  if (minutes === 300) return "5시간";
  if (minutes === 10_080) return "주 간";
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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date(unixSeconds * 1_000));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function formatRemaining(unixSeconds, now, language) {
  if (unixSeconds === null || unixSeconds === undefined) return null;
  const remainingMinutes = Math.max(
    0,
    Math.ceil((unixSeconds * 1_000 - now.getTime()) / 60_000),
  );
  const days = Math.floor(remainingMinutes / 1_440);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = String(remainingMinutes % 60).padStart(2, "0");
  const languageCode = normalizeLanguage(language);
  if (languageCode === "en") {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (Number(minutes) > 0 || parts.length === 0) parts.push(`${Number(minutes)}m`);
    return `in ${parts.join(" ")}`;
  }
  if (languageCode === "zh") {
    return `还剩${days > 0 ? `${days}天` : ""}${hours % 24 > 0 ? `${hours % 24}小时` : ""}${
      Number(minutes) > 0 || (days === 0 && hours % 24 === 0) ? `${Number(minutes)}分` : ""
    }`;
  }
  if (languageCode === "ja") {
    return `あと${days > 0 ? `${days}日` : ""}${hours % 24 > 0 ? `${hours % 24}時間` : ""}${
      Number(minutes) > 0 || (days === 0 && hours % 24 === 0) ? `${Number(minutes)}分` : ""
    }`;
  }
  return `${days > 0 ? `${days}일 ` : ""}${hours % 24 > 0 ? `${hours % 24}시간 ` : ""}${
    Number(minutes) > 0 || (days === 0 && hours % 24 === 0) ? `${Number(minutes)}분 ` : ""
  }후`.trim();
}

export function formatUsageMessage(
  usage,
  { timeZone = "Asia/Seoul", now = new Date(), language = "ko" } = {},
) {
  const selectedLanguage = normalizeLanguage(language);
  const checkedAt = formatTimestamp(now.getTime() / 1_000, timeZone, selectedLanguage);
  const lines = [`${translate(selectedLanguage, "usageTitle")}(${checkedAt})`, "────────────"];

  if (usage.windows.length === 0) {
    lines.push(translate(selectedLanguage, "noWindows"));
  } else {
    for (const window of usage.windows) {
      const remaining =
        window.remainingPercent === null
          ? translate(selectedLanguage, "unknown")
          : `${Math.round(window.remainingPercent)}%`;
      const label = windowLabel(window.durationMinutes, selectedLanguage);
      lines.push(`${label} │ ${remaining}`);
      const resetTime = formatTimestamp(window.resetsAt, timeZone, selectedLanguage);
      const resetRemaining = formatRemaining(window.resetsAt, now, selectedLanguage);
      lines.push(
        `↳ ${translate(selectedLanguage, "reset")}: ${resetTime}${
          resetRemaining ? ` (${resetRemaining})` : ""
        }`,
      );
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
    const expiry = Math.min(...expirations);
    lines.push(
        `↳ ${translate(selectedLanguage, "expires")}: ${formatTimestamp(
        expiry,
        timeZone,
        selectedLanguage,
      )} (${formatRemaining(expiry, now, selectedLanguage)})`,
    );
  }
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
