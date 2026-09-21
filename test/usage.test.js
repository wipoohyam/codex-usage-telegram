import test from "node:test";
import assert from "node:assert/strict";
import { formatUsageMessage, normalizeUsage } from "../src/usage.js";

const response = {
  rateLimits: {
    limitId: "codex",
    primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    secondary: { usedPercent: 40, windowDurationMins: 10_080, resetsAt: 1_800_100_000 },
  },
  rateLimitResetCredits: {
    availableCount: 1,
    credits: [
      {
        id: "credit-1",
        status: "available",
        expiresAt: 1_800_200_000,
        title: "Full reset",
      },
    ],
  },
};

test("normalizes five-hour and weekly windows", () => {
  const usage = normalizeUsage(response);
  assert.equal(usage.windows.length, 2);
  assert.equal(usage.windows[0].label, "5시간");
  assert.equal(usage.windows[0].remainingPercent, 75);
  assert.equal(usage.windows[1].label, "주간");
  assert.equal(usage.availableResetCount, 1);
});

test("formats a Korean Telegram report", () => {
  const message = formatUsageMessage(normalizeUsage(response), {
    timeZone: "Asia/Seoul",
    now: new Date("2026-09-21T00:00:00Z"),
  });
  assert.match(message, /5시간 잔여: 75%/);
  assert.match(message, /주간 잔여: 60%/);
  assert.match(message, /리셋 쿠폰: 1개/);
});

test("prefers multi-bucket view without duplicating fallback", () => {
  const usage = normalizeUsage({
    ...response,
    rateLimitsByLimitId: {
      codex: response.rateLimits,
      other: {
        primary: { usedPercent: 10, windowDurationMins: 60, resetsAt: 1_800_000_100 },
      },
    },
  });
  assert.equal(usage.windows.length, 3);
  assert.equal(usage.windows[0].label, "1시간");
});

test("does not report zero reset credits when the service omitted the field", () => {
  const usage = normalizeUsage({ rateLimits: response.rateLimits });
  assert.equal(usage.availableResetCount, null);
  assert.match(formatUsageMessage(usage), /리셋 쿠폰: 정보 없음/);
});
