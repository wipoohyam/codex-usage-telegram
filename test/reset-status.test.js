import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadState, saveState } from "../src/state.js";
import {
  fetchResetStatus,
  formatResetAnnouncement,
  shouldNotifyNewReset,
  shouldNotifyScheduledReset,
  scheduledResetFingerprint,
  notifyExternalResets,
} from "../src/reset-status.js";

const reset = {
  id: "reset-2",
  reset_type: "banked",
  announced_at: "2026-10-07T03:00:00.000Z",
  text: "A banked reset is available.",
  source: { type: "x_post", author: "thsottiaux", url: "https://example.com/reset" },
};

const scheduledReset = {
  ...reset,
  id: "scheduled-1",
  status: "scheduled",
  scheduled_for: "2026-10-23T01:00:00.000Z",
  text: "A reset is coming tomorrow.",
};

test("reads the latest reset and uses an ETag for conditional requests", async () => {
  let request;
  const result = await fetchResetStatus(
    { etag: '"old"', timeoutMs: 1_000 },
    async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: { latest_reset: reset, scheduled_reset: scheduledReset } }), {
        status: 200,
        headers: { "content-type": "application/json", etag: '"new"' },
      });
    },
  );

  assert.equal(request.options.headers["if-none-match"], '"old"');
  assert.equal(result.latestReset.id, "reset-2");
  assert.equal(result.etag, '"new"');
  assert.deepEqual(result.scheduledReset, scheduledReset);
});

test("handles an unchanged reset response", async () => {
  const result = await fetchResetStatus(
    { etag: '"same"', timeoutMs: 1_000 },
    async () => new Response(null, { status: 304 }),
  );
  assert.deepEqual(result, { notModified: true, etag: '"same"', latestReset: null, scheduledReset: null });
});

test("notifies only after the initial reset baseline changes", () => {
  assert.equal(shouldNotifyNewReset(reset, {}), false);
  assert.equal(
    shouldNotifyNewReset(reset, { lastSuccessAt: "2026-10-07T02:59:59.000Z" }),
    true,
  );
  assert.equal(
    shouldNotifyNewReset(reset, { lastSuccessAt: "2026-10-07T03:00:01.000Z" }),
    false,
  );
  assert.equal(
    shouldNotifyNewReset(reset, {
      codexResetsBaselineInitialized: true,
      lastCodexResetId: "reset-1",
    }),
    true,
  );
  assert.equal(
    shouldNotifyNewReset(reset, {
      codexResetsBaselineInitialized: true,
      lastCodexResetId: "reset-2",
    }),
    false,
  );
});

test("formats a credited reset alert with the source and disclaimer", () => {
  const message = formatResetAnnouncement(reset, { language: "ko", timeZone: "Asia/Seoul" });
  assert.match(message, /banked reset 쿠폰/);
  assert.match(message, /2026-10-07 12:00/);
  assert.match(message, /https:\/\/example\.com\/reset/);
  assert.match(message, /https:\/\/codex-resets\.com/);
  assert.match(message, /OpenAI의 공식 확정 정보가 아닙니다/);
});

test("notifies existing schedules on upgrade and changed schedules only once", () => {
  assert.equal(shouldNotifyScheduledReset(null), false);
  assert.equal(shouldNotifyScheduledReset({ ...scheduledReset, status: "completed" }), false);
  assert.equal(shouldNotifyScheduledReset(scheduledReset), true);
  const state = { lastCodexScheduledResetFingerprint: scheduledResetFingerprint(scheduledReset) };
  assert.equal(shouldNotifyScheduledReset(scheduledReset, state), false);
  assert.equal(shouldNotifyScheduledReset({ ...scheduledReset, scheduled_for: null }, state), true);
  assert.equal(shouldNotifyScheduledReset({ ...scheduledReset, id: "scheduled-2" }, state), true);
  // A passed estimate remains pending until the API provides completion evidence.
  assert.equal(shouldNotifyScheduledReset({ ...scheduledReset, scheduled_for: "2020-01-01T00:00:00Z" }), true);
});

test("scheduled alerts show a clear title, local time, source and attribution in every language", () => {
  for (const [language, title] of [["ko", "예고"], ["en", "scheduled"], ["zh", "预告"], ["ja", "予告"]]) {
    const message = formatResetAnnouncement(scheduledReset, { language, scheduled: true });
    assert.ok(message.split("\n")[0].includes(title));
    assert.match(message, /2026-10-23 10:00 \(Asia\/Seoul\)/);
    assert.ok(message.includes(scheduledReset.text));
    assert.ok(message.includes(scheduledReset.source.url));
    assert.match(message, /https:\/\/codex-resets\.com/);
    assert.match(message, /OpenAI/);
  }
  const noTime = formatResetAnnouncement({ ...scheduledReset, scheduled_for: null }, { scheduled: true });
  assert.match(noTime, /예정: 정보 없음/);
});

test("rejects malformed scheduled reset IDs", async () => {
  await assert.rejects(fetchResetStatus({}, async () => new Response(
    JSON.stringify({ data: { scheduled_reset: { id: 123 } } }),
  )), /invalid scheduled_reset/);
});

test("upgrades cached state, retries failed schedules, and persists deduplication across restarts", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "reset-alerts-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = {
    stateFile: path.join(directory, "state.json"),
    telegramToken: "test-token",
    telegramChatId: "123",
    timeZone: "Asia/Seoul",
    requestTimeoutMs: 1_000,
  };
  await saveState(config.stateFile, {
    codexResetsBaselineInitialized: true,
    lastCodexResetId: "reset-1",
    codexResetsEtag: '"legacy"',
    language: "ko",
    primeFullUsageEnabled: true,
  });
  const requests = [];
  const delivered = [];
  let failScheduled = true;
  let currentSchedule = scheduledReset;
  const fetchImpl = async (url, options) => {
    if (url.includes("codex-resets.com")) {
      requests.push(options.headers);
      return new Response(JSON.stringify({ data: { latest_reset: reset, scheduled_reset: currentSchedule } }), {
        headers: { etag: '"current"' },
      });
    }
    const { text } = JSON.parse(options.body);
    if (text.startsWith("📅") && failScheduled) {
      return new Response(JSON.stringify({ ok: false, description: "Unavailable" }), { status: 503 });
    }
    delivered.push(text);
    return new Response(JSON.stringify({ ok: true, result: { message_id: delivered.length } }));
  };
  await assert.rejects(notifyExternalResets(config, fetchImpl), /Unavailable/);
  let state = await loadState(config.stateFile);
  assert.equal(state.lastCodexResetId, reset.id);
  assert.equal(state.codexResetsEtag, '"legacy"');
  assert.equal(state.lastCodexScheduledResetFingerprint, undefined);
  assert.equal(requests[0]["if-none-match"], undefined);

  failScheduled = false;
  await notifyExternalResets(config, fetchImpl);
  await notifyExternalResets(config, fetchImpl);
  assert.equal(delivered.length, 2);
  assert.ok(delivered[0].startsWith("🔔"));
  assert.ok(delivered[1].startsWith("📅"));
  assert.equal(requests[2]["if-none-match"], '"current"');
  state = await loadState(config.stateFile);
  assert.equal(state.primeFullUsageEnabled, true);
  assert.equal(state.codexScheduledResetsInitialized, true);

  currentSchedule = { ...scheduledReset, scheduled_for: "2026-10-23T02:00:00.000Z" };
  await notifyExternalResets(config, fetchImpl);
  assert.equal(delivered.length, 3);
  assert.match(delivered[2], /11:00/);
  currentSchedule = null;
  await notifyExternalResets(config, fetchImpl);
  currentSchedule = { ...scheduledReset, scheduled_for: "2026-10-23T02:00:00.000Z" };
  await notifyExternalResets(config, fetchImpl);
  assert.equal(delivered.length, 3);
});
