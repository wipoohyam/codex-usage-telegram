import test from "node:test";
import assert from "node:assert/strict";
import {
  isAuthenticationError,
  loginWarningMessage,
  parseLoginCommand,
  reauthenticationMessage,
} from "../src/auth.js";

test("parses the two-step login commands", () => {
  assert.equal(parseLoginCommand("/login"), "request");
  assert.equal(parseLoginCommand("/login confirm"), "confirm");
  assert.equal(parseLoginCommand("/login@my_bot confirm"), "confirm");
  assert.equal(parseLoginCommand("/login now"), null);
});

test("recognizes authentication failures without classifying network failures", () => {
  assert.equal(isAuthenticationError(new Error("Codex is not signed in with ChatGPT")), true);
  assert.equal(isAuthenticationError(new Error("401 Unauthorized")), true);
  assert.equal(isAuthenticationError(new Error("error sending request")), false);
});

test("security and reauthentication messages explain the risk and recovery", () => {
  assert.match(loginWarningMessage(), /보안 경고/);
  assert.match(loginWarningMessage(), /\/login confirm/);
  assert.match(reauthenticationMessage("token expired"), /재로그인/);
  assert.match(reauthenticationMessage("token expired"), /docker compose run --rm monitor login/);
});
