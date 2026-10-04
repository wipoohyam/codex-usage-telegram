import test from "node:test";
import assert from "node:assert/strict";
import { parsePrimeCommand } from "../src/commands.js";

test("parses prime toggle commands", () => {
  assert.equal(parsePrimeCommand("/prime-status"), "status");
  assert.equal(parsePrimeCommand("/prime-on"), "on");
  assert.equal(parsePrimeCommand("/prime-off@my_bot"), "off");
  assert.equal(parsePrimeCommand("/prime off"), null);
  assert.equal(parsePrimeCommand("/prime_now"), null);
});
