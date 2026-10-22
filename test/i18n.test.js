import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_LANGUAGES, translate } from "../src/i18n.js";

test("prime notification identifies the action on its first line", () => {
  assert.equal(
    translate("ko", "primeStarted", { remainingPercent: "100.00" }),
    "⚡ Prime 실행\n\n⏰ 5시간 잔여량: 100.00%\nCodex에 1+1 요청을 보냅니다.",
  );
  for (const language of SUPPORTED_LANGUAGES) {
    const message = translate(language, "primeStarted", { remainingPercent: "100.00" });
    assert.match(message.split("\n")[0], /^⚡ Prime/);
    assert.match(message, /100\.00%/);
  }
});
