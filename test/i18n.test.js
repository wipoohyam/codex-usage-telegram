import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_LANGUAGES, translate } from "../src/i18n.js";
import { parseLanguageCommand, parseLoginCommand } from "../src/auth.js";
import { parsePrimeCommand } from "../src/commands.js";

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

test("help documents all commands, language options and accepted aliases in every language", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const help = translate(language, "help");
    const commands = [...help.matchAll(/^\/(\S+?)(?: -|$)/gm)].map((match) => match[1]);
    for (const command of ["status", "prime-on", "prime-off", "prime-status", "login", "login_confirm", "language", "help", "start", "lang"]) {
      assert.ok(commands.includes(command), `${language}: missing /${command}`);
    }
    for (const code of SUPPORTED_LANGUAGES) {
      assert.ok(help.includes(`/language ${code} -`));
      assert.equal(parseLanguageCommand(`/language ${code}`).valid, true);
    }
    for (const name of ["한국어", "English", "中文", "日本語"]) {
      assert.ok(help.includes(name));
      assert.equal(parseLanguageCommand(`/lang ${name}`).valid, true);
    }
    for (const alias of ["/login-confirm", "/login confirm"]) {
      assert.ok(help.includes(alias));
      assert.equal(parseLoginCommand(alias), "confirm");
    }
    for (const action of ["on", "off", "status"]) {
      assert.equal(parsePrimeCommand(`/prime-${action}`), action);
    }
    assert.ok(help.length < 4096);
  }
});

test("standalone replies identify their function in the first line in all languages", () => {
  const keys = [
    "languageChanged", "languageInvalid", "statusFailure", "loginPrivateOnly",
    "loginActive", "loginCooldown", "loginExpired", "loginRequesting",
    "loginSuccess", "loginUsageFailure", "primeFailed", "primeEnabled",
    "primeDisabled", "primeStatus",
  ];
  for (const language of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const text = translate(language, key, { language, detail: "test error", enabled: true, source: "env" });
      const [title, body] = text.split("\n\n");
      assert.ok(title && body, `${language}/${key}: missing title or body`);
      assert.ok(!title.includes("\n"), `${language}/${key}: title must be one line`);
    }
  }
  assert.match(translate("ko", "loginExpired").split("\n")[0], /로그인 확인 만료/);
  assert.match(translate("ko", "languageInvalid").split("\n")[0], /알림 언어/);
});
