# Codex Usage Telegram

[English](README.md) | [한국어](README.ko.md)

![텔레그램으로 받는 Codex 사용량 알림](alarm_message.jpg)

ChatGPT Codex의 잔여 사용량, 초기화 시각, 리셋 쿠폰을 텔레그램에서 확인할 수 있습니다. 의미 있는 변화가 있을 때만 알려주므로 같은 내용의 알림이 반복되지 않습니다. OpenAI API 키는 필요하지 않습니다.

## 무엇을 확인할 수 있나요?

- 5시간·주간 및 Codex가 제공하는 다른 구간의 잔여 사용량
- 정확한 초기화 시각과 남은 시간
- 제공되는 경우 리셋 쿠폰 수량과 만료 시각
- 한국어·영어·중국어·일본어 자동 알림
- `/status`를 이용한 즉시 조회
- ChatGPT 로그인 만료 알림

봇은 기본적으로 20분마다 사용량을 확인합니다. 표시 퍼센티지 또는 초기화 시각이 달라지고, 이전 사용량 메시지로부터 60분 이상 지났을 때만 자동 알림을 보냅니다. 60분 동안 여러 번 바뀌면 가장 최신 상태만 한 번 전송합니다. 5시간 잔여량이 100%일 때는 초기화 시각이 계속 움직일 수 있으므로, 표시 잔여량이 100% 미만이 될 때까지 해당 초기화 시각의 변화는 무시합니다.

## 준비물

- Docker Compose를 실행할 수 있는 PC 또는 서버
- [@BotFather](https://t.me/BotFather)에서 발급받은 텔레그램 봇 토큰
- Codex를 사용할 수 있는 ChatGPT 계정

봇은 반드시 개인 텔레그램 채팅에서 사용하세요. 다른 사람이 접근할 수 있는 그룹에는 추가하지 않는 것이 좋습니다.

## 설치하기

1. 프로젝트를 받고 설정 파일을 만듭니다.

   ```sh
   git clone https://github.com/wipoohyam/codex-usage-telegram.git
   cd codex-usage-telegram
   cp .env.example .env
   ```

2. 새 텔레그램 봇에게 아무 메시지나 보냅니다. 그다음 `<YOUR_TOKEN>`을 BotFather에서 받은 토큰으로 바꿔 아래 주소를 브라우저에서 엽니다.

   ```text
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

   응답에서 `message.chat.id`를 찾습니다. 이 숫자가 개인 채팅 ID입니다.

3. `.env`를 열고 봇 토큰과 채팅 ID를 입력합니다.

   ```env
   TELEGRAM_BOT_TOKEN=봇_토큰
   TELEGRAM_CHAT_ID=숫자_채팅_ID
   ```

   `.env`에는 봇 토큰이 들어 있으므로 공개하거나 공유하면 안 됩니다.

4. ChatGPT의 **설정 → 보안**에서 **Codex용 장치 코드 인증**을 활성화합니다.

5. 최신 이미지를 받고 봇을 시작합니다.

   ```sh
   docker compose pull
   docker compose up -d
   ```

6. ChatGPT에 로그인합니다. 서버에서 직접 로그인하는 방법이 더 안전합니다.

   ```sh
   docker compose run --rm codex-usage login
   ```

   텔레그램 개인 채팅에서 `/login`을 보낸 뒤 60초 안에 `/login_confirm`을 보내도 됩니다. 전달된 인증 주소를 열고 일회용 코드를 입력하세요. 로그인 관련 메시지는 성공·실패 또는 약 10분 후 자동으로 삭제됩니다.

7. 봇에게 `/status`를 보냅니다. 현재 Codex 잔여 한도가 바로 도착하면 설치가 완료된 것입니다.

## 텔레그램 명령어

| 명령어 | 기능 |
| --- | --- |
| `/status` | 현재 사용량을 즉시 확인합니다 |
| `/login` | ChatGPT 로그인 또는 재로그인을 시작합니다 |
| `/login_confirm` | 60초 안에 텔레그램 로그인 요청을 확인합니다 |
| `/language` | 한국어·영어·중국어·일본어를 선택합니다 |
| `/help` | 사용할 수 있는 명령어를 표시합니다 |

예를 들어 `/language ko`를 보내면 알림이 한국어로 바뀝니다. `/status`로 직접 조회하면 다음 자동 알림까지의 60분 간격도 그 시점부터 다시 계산됩니다.

## 바꿔볼 만한 설정

`.env`를 수정한 다음 `docker compose up -d --force-recreate`를 실행하면 적용됩니다.

| 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `POLL_INTERVAL_MINUTES` | `20` | Codex 사용량을 확인하는 간격 |
| `NOTIFICATION_MIN_INTERVAL_MINUTES` | `60` | 자동 알림 사이의 최소 간격 |
| `TZ` | `Asia/Seoul` | 알림에 표시할 시간대 |

## 업데이트

프로젝트 폴더에서 다음 명령을 실행합니다.

```sh
git pull
docker compose pull
docker compose up -d --force-recreate
```

컨테이너를 업데이트해도 저장된 ChatGPT 로그인과 봇 상태는 유지됩니다.

## 문제가 있을 때

- **`/status`에 응답이 없을 때:** `TELEGRAM_CHAT_ID`가 명령을 보낸 개인 채팅의 숫자 ID인지 확인하세요. 이후 `docker compose logs --tail=100 codex-usage`로 로그를 확인합니다.
- **로그인이 만료됐을 때:** `/login`과 `/login_confirm`을 다시 보내거나, 서버에서 `docker compose run --rm codex-usage login`을 실행하세요.
- **조회가 한 번 타임아웃됐을 때:** 다음 자동 조회를 기다리거나 `/status`를 다시 보내세요. 한 번의 타임아웃은 대부분 일시적입니다.
- **설정을 바꿨는데 적용되지 않을 때:** `docker compose up -d --force-recreate`로 컨테이너를 다시 만드세요.

## 중지 또는 제거

로그인과 설정을 유지하면서 봇을 중지합니다.

```sh
docker compose down
```

저장된 ChatGPT 로그인과 알림 상태까지 의도적으로 삭제하려는 경우가 아니라면 `-v`를 추가하지 마세요.

## 보안 주의사항

- `.env`를 공유하거나 Git에 올리지 마세요.
- 설정한 개인 채팅에서만 봇을 사용하세요.
- 장치 로그인 코드는 만료될 때까지 비밀번호처럼 취급하세요.
- 가능하면 서버에서 직접 로그인하세요.

자세한 내용은 공식 [Codex 인증 문서](https://developers.openai.com/codex/auth)를 참고하세요.

## 라이선스

MIT
