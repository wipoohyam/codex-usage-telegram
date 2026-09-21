function asFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function windowLabel(minutes) {
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

function formatTimestamp(unixSeconds, timeZone) {
  if (unixSeconds === null || unixSeconds === undefined) return "정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSeconds * 1_000));
}

export function formatUsageMessage(usage, { timeZone = "Asia/Seoul", now = new Date() } = {}) {
  const lines = ["📊 Codex 사용량", ""];

  if (usage.windows.length === 0) {
    lines.push("사용량 창 정보를 받지 못했습니다.");
  } else {
    for (const window of usage.windows) {
      const remaining =
        window.remainingPercent === null ? "정보 없음" : `${Math.round(window.remainingPercent)}%`;
      lines.push(`${window.label} 잔여: ${remaining}`);
      lines.push(`초기화: ${formatTimestamp(window.resetsAt, timeZone)}`);
      lines.push("");
    }
  }

  lines.push(
    `리셋 쿠폰: ${usage.availableResetCount === null ? "정보 없음" : `${usage.availableResetCount}개`}`,
  );
  const expirations = (usage.credits || [])
    .filter((credit) => credit.status === "available" && credit.expiresAt)
    .map((credit) => credit.expiresAt);
  if (expirations.length > 0) {
    lines.push(`가장 빠른 만료: ${formatTimestamp(Math.min(...expirations), timeZone)}`);
  }
  lines.push("");
  lines.push(
    `조회: ${new Intl.DateTimeFormat("ko-KR", {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now)}`,
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
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
