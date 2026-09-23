# Codex Usage Telegram

[English](README.md) | [한국어](README.ko.md)

ChatGPT Codex 사용량 한도와 적립된 리셋 크레딧을 텔레그램으로 알려주는 셀프 호스팅 도구입니다. 모델을 호출하지 않으며 OpenAI API 키도 필요하지 않습니다.

## 주요 기능

- 5시간·주간 및 그 밖의 사용량 구간별 잔여량과 초기화 시각 표시
- 제공되는 경우 적립된 리셋 크레딧 표시
- 기본 90분 간격 자동 확인
- `/status` 명령으로 즉시 확인
- ChatGPT 인증 만료 시 알림
- 개인 텔레그램 채팅에서 ChatGPT 로그인 및 재로그인 지원
- 한국어·영어·중국어·일본어 알림 지원
- 공개 포트, 웹훅, 도메인 및 웹 서버 불필요

## Docker Compose로 설치

준비물: Docker Compose와 [@BotFather](https://t.me/BotFather)에서 발급받은 텔레그램 봇 토큰

1. 설정 파일을 받습니다.

   ```sh
   git clone https://github.com/wipoohyam/codex-usage-telegram.git
   cd codex-usage-telegram
   cp .env.example .env
   ```

2. `.env`에 텔레그램 정보를 입력합니다.

   ```env
   TELEGRAM_BOT_TOKEN=봇_토큰
   TELEGRAM_CHAT_ID=숫자_채팅_ID
   ```

   채팅 ID를 확인하려면 봇에게 메시지를 보낸 후 다음 주소를 엽니다.

   ```text
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

   봇 사용자명이 아니라 숫자로 된 `message.chat.id`를 사용하세요. `.env`는 공개하거나 공유하면 안 됩니다.

3. ChatGPT의 **설정 → 보안**에서 **Codex용 장치 코드 인증**을 활성화합니다.

4. 이미지를 받고 서비스를 시작합니다.

   ```sh
   docker compose pull
   docker compose up -d
   ```

5. 아래 두 방법 중 하나로 ChatGPT에 로그인합니다.

### 방법 A: 텔레그램에서 로그인

설정한 개인 텔레그램 채팅에서 다음 명령을 보냅니다.

```text
/login
```

봇이 보안 경고를 표시합니다. 계속하려면 60초 안에 다음 명령을 보냅니다.

```text
/login_confirm
```

인증 URL과 일회용 코드가 별도 메시지로 전송됩니다. 스포일러를 눌러 코드를 표시하고, 인증 URL을 연 뒤 코드를 입력해 ChatGPT 로그인을 완료합니다.

로그인 메시지는 성공·실패 또는 약 10분 후 자동으로 삭제됩니다.

### 방법 B: 서버에서 로그인

더 안전한 서버 측 로그인 방법은 다음과 같습니다.

```sh
docker compose run --rm codex-usage login
```

6. 텔레그램 봇에게 `/status`를 보내 정상 작동을 확인합니다.

## 텔레그램 명령어

- `/status` — 사용량 즉시 확인
- `/login` — 보안 경고를 확인하고 ChatGPT 로그인 또는 재로그인 시작
- `/login_confirm` — 60초 안에 로그인을 확인하고 계속 진행
- `/language` — 한국어·영어·중국어·일본어 선택 (예: `/language en`)
- `/help` — 사용 가능한 명령어 표시

텔레그램 로그인 시 인증 안내와 일회용 코드는 별도 메시지로 전송됩니다. 스포일러를 눌러 코드를 표시한 다음 복사하세요. 로그인 메시지는 성공·실패 또는 약 10분 후 삭제됩니다.

알림 언어를 바꾸려면 `/language`를 보내고 `ko`, `en`, `zh`, `ja` 중 하나를 선택하세요. 선택한 언어는 서비스 상태 볼륨에 저장됩니다.

## 설정

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | 필수 | 텔레그램 봇 토큰 |
| `TELEGRAM_CHAT_ID` | 필수 | 숫자로 된 개인 채팅 ID |
| `POLL_INTERVAL_MINUTES` | `90` | 사용량 확인 간격 |
| `TZ` | `Asia/Seoul` | 알림에 사용할 시간대 |
| `NOTIFY_MODE` | `always` | `always` 또는 `changes` |
| `REQUEST_TIMEOUT_SECONDS` | `30` | 요청 제한 시간 |
| `TELEGRAM_LONG_POLL_SECONDS` | `50` | 텔레그램 명령 확인 대기 시간 |

## 운영

최신 이미지로 업데이트:

```sh
docker compose pull
docker compose up -d --force-recreate
```

상태와 로그 확인:

```sh
docker compose ps
docker compose logs --tail=100 codex-usage
```

로그인 정보를 유지하면서 컨테이너 종료 및 제거:

```sh
docker compose down
```

저장된 ChatGPT 로그인과 애플리케이션 상태를 삭제하려는 경우가 아니라면 `docker compose down -v`를 사용하지 마세요.

## 보안

- ChatGPT 인증 정보는 비공개 `codex-auth` Docker 볼륨에 저장됩니다.
- 텔레그램 봇 토큰은 서버의 `.env`에만 저장됩니다.
- 설정된 개인 `TELEGRAM_CHAT_ID`에서 온 명령만 허용됩니다.
- 텔레그램 장치 코드는 자동 삭제 전에 복사·전달·캡처될 수 있으므로 공유하지 마세요.
- 가능하면 서버 측 로그인 방식을 사용하세요.

자세한 내용은 공식 [Codex 인증 문서](https://developers.openai.com/codex/auth)를 참고하세요.

## 라이선스

MIT
