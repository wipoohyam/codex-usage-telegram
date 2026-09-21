import test from "node:test";
import assert from "node:assert/strict";
import { getTelegramUpdates, sendTelegramMessage } from "../src/telegram.js";

test("sends a Telegram message without exposing configuration", async () => {
  let capturedUrl;
  let capturedBody;
  const fakeFetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    };
  };

  const result = await sendTelegramMessage(
    { token: "secret-token", chatId: "42", text: "hello", timeoutMs: 1_000 },
    fakeFetch,
  );
  assert.match(capturedUrl, /secret-token/);
  assert.deepEqual(capturedBody, {
    chat_id: "42",
    text: "hello",
    disable_web_page_preview: true,
  });
  assert.equal(result.message_id, 1);
});

test("returns a useful Telegram API error", async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ ok: false, description: "Bad Request" }),
  });
  await assert.rejects(
    sendTelegramMessage(
      { token: "secret", chatId: "42", text: "hello", timeoutMs: 1_000 },
      fakeFetch,
    ),
    /Bad Request/,
  );
});

test("receives Telegram commands with long polling", async () => {
  let capturedUrl;
  const fakeFetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: [{ update_id: 7, message: { text: "/status", chat: { id: 42 } } }],
      }),
    };
  };
  const updates = await getTelegramUpdates(
    { token: "secret", offset: 7, timeoutSeconds: 20, requestTimeoutMs: 1_000 },
    fakeFetch,
  );
  assert.equal(updates[0].message.text, "/status");
  assert.match(capturedUrl, /getUpdates/);
  assert.match(capturedUrl, /offset=7/);
  assert.match(capturedUrl, /timeout=20/);
});
