import test from "node:test";
import assert from "node:assert/strict";
import {
  isAuthenticationError,
  loginCodeMessage,
  loginWarningMessage,
  parseLanguageCommand,
  parseLoginCommand,
  reauthenticationMessage,
} from "../src/auth.js";

test("parses the two-step login commands", () => {
  assert.equal(parseLoginCommand("/login"), "request");
  assert.equal(parseLoginCommand("/login_confirm"), "confirm");
  assert.equal(parseLoginCommand("/login_confirm@my_bot"), "confirm");
  assert.equal(parseLoginCommand("/login-confirm"), "confirm");
  assert.equal(parseLoginCommand("/login confirm"), "confirm");
  assert.equal(parseLoginCommand("/login@my_bot confirm"), "confirm");
  assert.equal(parseLoginCommand("/login now"), null);
});

test("parses language selection commands", () => {
  assert.deepEqual(parseLanguageCommand("/language"), { value: null, valid: true });
  assert.deepEqual(parseLanguageCommand("/language en"), { value: "en", valid: true });
  assert.deepEqual(parseLanguageCommand("/lang@my_bot zh"), { value: "zh", valid: true });
  assert.deepEqual(parseLanguageCommand("/language ja"), { value: "ja", valid: true });
  assert.deepEqual(parseLanguageCommand("/language xx"), { value: "xx", valid: false });
});

test("recognizes authentication failures without classifying network failures", () => {
  assert.equal(isAuthenticationError(new Error("Codex is not signed in with ChatGPT")), true);
  assert.equal(isAuthenticationError(new Error("401 Unauthorized")), true);
  assert.equal(isAuthenticationError(new Error("error sending request")), false);
});

test("security and reauthentication messages explain the risk and recovery", () => {
  assert.match(loginWarningMessage(), /보안 경고/);
  assert.match(loginWarningMessage(), /\/login_confirm/);
  assert.match(reauthenticationMessage("token expired"), /재로그인/);
  assert.match(reauthenticationMessage("token expired"), /docker compose run --rm codex-usage login/);
});

test("login codes have a localized title and mask only the copyable code", () => {
  for (const language of ["ko", "en", "zh", "ja"]) {
    const message = loginCodeMessage("ABCD-EFGH", language);
    assert.match(message.text.split("\n")[0], /^🔑 Codex /);
    assert.equal(message.entities.length, 1);
    const entity = message.entities[0];
    assert.equal(entity.type, "spoiler");
    assert.equal(message.text.slice(entity.offset, entity.offset + entity.length), "ABCD-EFGH");
    assert.equal(message.text.slice(0, entity.offset).endsWith("\n\n"), true);
  }
});
