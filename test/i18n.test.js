import test from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/i18n.js";

test("prime notification shows the remaining usage and action on separate lines", () => {
  assert.equal(
    translate("ko", "primeStarted", { remainingPercent: "100.00" }),
    "⏰ 5시간 잔여량: 100.00%\n⚡ Prime 실행: Codex에 1+1 요청을 보냅니다.",
  );
});
