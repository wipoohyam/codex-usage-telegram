import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { CodexAppServerClient } from "../src/codex-client.js";

function fakeAppServer() {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("exit", 0, "SIGTERM");
  child.stdin.on("finish", () => child.emit("exit", 0, null));

  let buffer = "";
  child.stdin.on("data", (chunk) => {
    buffer += chunk.toString();
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const request = JSON.parse(line);
      if (request.method === "initialize") {
        child.stdout.write(`${JSON.stringify({ id: request.id, result: {} })}\n`);
      } else if (request.method === "account/login/start") {
        child.stdout.write(
          `${JSON.stringify({
            id: request.id,
            result: {
              type: "chatgptDeviceCode",
              loginId: "login-1",
              verificationUrl: "https://auth.openai.com/codex/device",
              userCode: "ABCD-1234",
            },
          })}\n`,
        );
      }
    }
  });

  return child;
}

test("starts a structured device-code login and receives completion", async () => {
  const child = fakeAppServer();
  const client = new CodexAppServerClient({
    spawnImpl: () => child,
    timeoutMs: 1_000,
    logger: { warn() {} },
  });

  await client.start();
  const challenge = await client.startDeviceCodeLogin();
  assert.equal(challenge.userCode, "ABCD-1234");

  const completed = client.waitForNotification("account/login/completed", {
    predicate: (params) => params?.loginId === challenge.loginId,
    timeoutMs: 1_000,
  });
  child.stdout.write(
    `${JSON.stringify({
      method: "account/login/completed",
      params: { loginId: "login-1", success: true, error: null },
    })}\n`,
  );

  assert.equal((await completed).success, true);
  await client.close();
});
