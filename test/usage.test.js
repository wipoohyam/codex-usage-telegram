import test from "node:test";
import assert from "node:assert/strict";
import {
  formatUsageMessage,
  normalizeUsage,
  notificationFingerprint,
  shouldPrimeFullUsage,
  usageNotificationDecision,
} from "../src/usage.js";

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
  assert.equal(usage.windows[0].label, "⏰5시간");
  assert.equal(usage.windows[0].remainingPercent, 75);
  assert.equal(usage.windows[1].label, "🗓️주 간");
  assert.equal(usage.availableResetCount, 1);
});

test("formats a readable Korean Telegram report", () => {
  const message = formatUsageMessage(normalizeUsage(response), {
    timeZone: "Asia/Seoul",
    now: new Date("2026-09-21T00:00:00Z"),
  });
  assert.match(message, /⏰5시간 │ 75\.00%/);
  assert.match(message, /🗓️주 간 │ 60\.00%/);
  assert.match(message, /🎟 리셋 쿠폰: 1개/);
  assert.match(message, /Codex 잔여 한도\(2026-09-21 09:00\)/);
  assert.match(message, /↳ 초기화: 2027-01-15 17:00 \(\d+일 \d+시간 후\)/);
  assert.match(message, /2027-01-15 17:00 \(\d+일 \d+시간 후\)/);
  assert.doesNotMatch(message, /확인:/);
  assert.match(message, /\/status$/);
});

test("formats English, Chinese, and Japanese reports", () => {
  const usage = normalizeUsage(response);
  assert.match(formatUsageMessage(usage, { language: "en" }), /Codex Remaining Limits/);
  assert.match(formatUsageMessage(usage, { language: "zh" }), /Codex 剩余额度/);
  assert.match(formatUsageMessage(usage, { language: "ja" }), /Codex 残り上限/);
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

test("uses displayed percentages and reset times for notification changes", () => {
  const usage = normalizeUsage(response);
  const fingerprint = notificationFingerprint(usage);
  const changedReset = normalizeUsage({
    rateLimits: {
      ...response.rateLimits,
      secondary: { ...response.rateLimits.secondary, resetsAt: 1_800_100_100 },
    },
  });

  assert.notEqual(notificationFingerprint(changedReset), fingerprint);
});

test("ignores five-hour reset changes while remaining usage is exactly 100 percent", () => {
  const first = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 0, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    },
  });
  const second = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 0, windowDurationMins: 300, resetsAt: 1_800_000_100 },
    },
  });

  assert.equal(notificationFingerprint(first), notificationFingerprint(second));
});

test("detects five-hour reset changes below actual 100 percent", () => {
  const first = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 1, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    },
  });
  const second = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 1, windowDurationMins: 300, resetsAt: 1_800_000_100 },
    },
  });

  assert.notEqual(notificationFingerprint(first), notificationFingerprint(second));
});

test("displays and compares remaining usage to two decimal places", () => {
  const first = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 0.08, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    },
  });
  const second = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 0.09, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    },
  });

  assert.match(formatUsageMessage(first), /99\.92%/);
  assert.notEqual(notificationFingerprint(first), notificationFingerprint(second));
});

test("waits an hour after the last usage notification and compares with the sent state", () => {
  const usage = normalizeUsage(response);
  const unchangedFingerprint = notificationFingerprint(usage);
  const changedUsage = normalizeUsage({
    rateLimits: {
      ...response.rateLimits,
      primary: { ...response.rateLimits.primary, usedPercent: 30 },
    },
  });

  assert.equal(
    usageNotificationDecision(changedUsage, {
      lastFingerprint: unchangedFingerprint,
      lastNotificationAt: "2026-09-21T00:00:00.000Z",
      now: new Date("2026-09-21T00:40:00.000Z"),
    }).shouldSend,
    false,
  );
  assert.equal(
    usageNotificationDecision(changedUsage, {
      lastFingerprint: unchangedFingerprint,
      lastNotificationAt: "2026-09-21T00:00:00.000Z",
      now: new Date("2026-09-21T01:00:00.000Z"),
    }).shouldSend,
    true,
  );
  assert.equal(
    usageNotificationDecision(usage, {
      lastFingerprint: unchangedFingerprint,
      lastNotificationAt: "2026-09-21T00:00:00.000Z",
      now: new Date("2026-09-21T02:00:00.000Z"),
    }).shouldSend,
    false,
  );
});

test("primes only when both core windows display 100 percent and the cooldown elapsed", () => {
  const fullUsage = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 0, windowDurationMins: 300, resetsAt: 1_800_000_000 },
      secondary: { usedPercent: 0, windowDurationMins: 10_080, resetsAt: 1_800_100_000 },
    },
  });
  const partlyUsed = normalizeUsage({
    rateLimits: {
      limitId: "codex",
      primary: { usedPercent: 1, windowDurationMins: 300, resetsAt: 1_800_000_000 },
      secondary: { usedPercent: 0, windowDurationMins: 10_080, resetsAt: 1_800_100_000 },
    },
  });

  assert.equal(shouldPrimeFullUsage(fullUsage), true);
  assert.equal(shouldPrimeFullUsage(partlyUsed), false);
  assert.equal(
    shouldPrimeFullUsage(fullUsage, {
      lastPrimeAt: "2026-10-04T00:00:00.000Z",
      now: new Date("2026-10-04T00:10:00.000Z"),
    }),
    false,
  );
  assert.equal(
    shouldPrimeFullUsage(fullUsage, {
      lastPrimeAt: "2026-10-04T00:00:00.000Z",
      now: new Date("2026-10-04T00:20:00.000Z"),
    }),
    true,
  );
});
