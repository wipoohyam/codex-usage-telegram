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
  const match = text.trim().match(/^\/login(?:@\w+)?(?:\s+(confirm))?\s*$/i);
  if (!match) return null;
  return match[1] ? "confirm" : "request";
}

export function isAuthenticationError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function loginWarningMessage() {
  return [
    "⚠️ Codex 재로그인 보안 경고",
    "",
    "이 기능은 ChatGPT 장치 인증 URL과 일회용 코드를 이 개인 Telegram 채팅으로 전송합니다.",
    "코드를 받은 사람은 로그인 절차를 악용할 수 있으므로 메시지를 전달하거나 캡처해서 공유하지 마세요.",
    "",
    "계속하려면 60초 안에 /login confirm 을 보내세요.",
    "더 안전한 방법: 서버에서 docker compose run --rm codex-usage login",
  ].join("\n");
}

export function reauthenticationMessage(detail) {
  return [
    "🔐 Codex 재로그인이 필요합니다.",
    "",
    "개인 채팅에서 /login 을 보내거나 서버에서 다음 명령을 실행하세요:",
    "docker compose run --rm codex-usage login",
    "",
    "⚠️ /login은 일회용 인증 코드가 Telegram을 통과합니다. 보안상 서버 명령 사용을 권장합니다.",
    detail ? `\n오류: ${detail}` : "",
  ].join("\n");
}
