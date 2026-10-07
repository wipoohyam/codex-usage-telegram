import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchResetStatus,
  formatResetAnnouncement,
  shouldNotifyNewReset,
} from "../src/reset-status.js";

const reset = {
  id: "reset-2",
  reset_type: "banked",
  announced_at: "2026-10-07T03:00:00.000Z",
  text: "A banked reset is available.",
  source: { type: "x_post", author: "thsottiaux", url: "https://example.com/reset" },
};

test("reads the latest reset and uses an ETag for conditional requests", async () => {
  let request;
  const result = await fetchResetStatus(
    { etag: '"old"', timeoutMs: 1_000 },
    async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: { latest_reset: reset } }), {
        status: 200,
        headers: { "content-type": "application/json", etag: '"new"' },
      });
    },
  );

  assert.equal(request.options.headers["if-none-match"], '"old"');
  assert.equal(result.latestReset.id, "reset-2");
  assert.equal(result.etag, '"new"');
});

test("handles an unchanged reset response", async () => {
  const result = await fetchResetStatus(
    { etag: '"same"', timeoutMs: 1_000 },
    async () => new Response(null, { status: 304 }),
  );
  assert.deepEqual(result, { notModified: true, etag: '"same"', latestReset: null });
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
