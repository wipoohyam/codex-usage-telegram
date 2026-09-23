const AUTH_ERROR_PATTERNS = [
  /not signed in/i,
  /reauthenticationrequired/i,
  /unauthori[sz]ed/i,
  /invalid[_ -]?token/i,
  /expired[_ -]?(?:access[_ -]?)?token/i,
  /token[_ -]?refresh/i,
  /authentication.+(?:required|failed|expired)/i,
];

export function parseLoginCommand(text = "") {
  const command = text.trim();
  if (/^\/login(?:@\w+)?$/i.test(command)) return "request";
  if (/^\/login[_-]confirm(?:@\w+)?$/i.test(command)) return "confirm";
  if (/^\/login(?:@\w+)?\s+confirm$/i.test(command)) return "confirm";
  return null;
}

export function parseLanguageCommand(text = "") {
  const match = text.trim().match(/^\/(?:language|lang)(?:@\w+)?(?:\s+([^\s]+))?$/i);
  if (!match) return null;
  const aliases = { 한국어: "ko", english: "en", 中文: "zh", 日本語: "ja" };
  const value = match[1] ? aliases[match[1].toLowerCase()] || match[1].toLowerCase() : null;
  return { value, valid: value === null || SUPPORTED_LANGUAGES.includes(value) };
}

export function isAuthenticationError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function loginWarningMessage(language = "ko") {
  const selectedLanguage = normalizeLanguage(language);
  return [
    translate(selectedLanguage, "loginWarningTitle"),
    "",
    translate(selectedLanguage, "loginWarningBody"),
    translate(selectedLanguage, "loginWarningShare"),
    "",
    translate(selectedLanguage, "loginWarningConfirm"),
    translate(selectedLanguage, "saferLogin"),
  ].join("\n");
}

export function reauthenticationMessage(detail, language = "ko") {
  const selectedLanguage = normalizeLanguage(language);
  return [
    translate(selectedLanguage, "reauthTitle"),
    "",
    translate(selectedLanguage, "reauthBody"),
    "docker compose run --rm codex-usage login",
    "",
    translate(selectedLanguage, "reauthWarning"),
    detail ? `\n${selectedLanguage === "ko" ? "오류" : selectedLanguage === "zh" ? "错误" : selectedLanguage === "ja" ? "エラー" : "Error"}: ${detail}` : "",
  ].join("\n");
}
import { normalizeLanguage, SUPPORTED_LANGUAGES, translate } from "./i18n.js";
