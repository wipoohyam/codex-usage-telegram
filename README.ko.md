# Codex Usage Telegram

[English](README.md) | **한국어**

ChatGPT Codex 잔여량과 초기화 시각을 Telegram에서 확인하고, 달라졌을 때만 알림을 받는 셀프 호스팅 봇입니다. OpenAI API 키는 필요하지 않습니다.

<p align="center">
  <img src="alarm_message.jpg" alt="Telegram으로 받는 Codex 사용량 알림" width="500">
</p>

## 이 봇으로 할 수 있는 일

- `/status` 한 번으로 5시간·주간 잔여량과 초기화 시각 확인
- 리셋 쿠폰 수량과 만료 시각 확인
- 잔여량이나 초기화 시각이 실제로 달라졌을 때 자동 알림
- [Codex Resets](https://codex-resets.com)의 새로운 커뮤니티 reset 발표 알림
- Telegram에서 ChatGPT 재로그인 및 알림 언어 변경
- 선택적으로 5시간 한도가 100%일 때 작은 Codex 요청을 보내 실제 사용 주기 시작

한국어·영어·중국어·일본어를 지원하며, 외부에서 접속할 포트나 웹 서버가 필요하지 않습니다.

## 설치 전 준비

1. Docker Compose를 실행할 PC 또는 서버
2. [@BotFather](https://t.me/BotFather)에서 만든 Telegram 봇
3. Codex를 사용할 수 있는 ChatGPT 계정

보안을 위해 봇은 본인의 Telegram 개인 채팅에서만 사용하세요.

## 빠른 설치

### 1. 프로젝트와 설정 파일 준비

```sh
git clone https://github.com/wipoohyam/codex-usage-telegram.git
cd codex-usage-telegram
cp .env.example .env
```

### 2. Telegram 채팅 ID 확인

새 봇에게 아무 메시지나 보낸 다음, `<YOUR_TOKEN>`을 BotFather에서 받은 토큰으로 바꿔 아래 주소를 브라우저에서 엽니다.

```text
https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

응답의 `message.chat.id` 숫자가 개인 채팅 ID입니다.

### 3. `.env` 입력

```env
TELEGRAM_BOT_TOKEN=BotFather에서_받은_토큰
TELEGRAM_CHAT_ID=개인_채팅_ID
```

`.env`에는 봇 제어 권한이 있는 토큰이 들어 있으므로 공유하거나 Git에 올리지 마세요.

### 4. ChatGPT 장치 인증 허용

ChatGPT의 **설정 → 보안**에서 **Codex용 장치 코드 인증**을 활성화합니다.

### 5. 봇 시작 및 로그인

```sh
docker compose pull
docker compose up -d
docker compose run --rm codex-usage login
```

표시된 주소에서 장치 코드를 입력해 ChatGPT 로그인을 마칩니다. 로그인 정보와 봇 상태는 Docker 볼륨에 저장되므로 컨테이너를 업데이트해도 유지됩니다.

이제 Telegram 봇에게 `/status`를 보내세요. 현재 Codex 잔여량이 오면 설치가 끝난 것입니다.

> Telegram에서 `/login`을 보내고 60초 안에 `/login_confirm`을 보내는 방법도 있습니다. 다만 일회용 코드가 Telegram을 통과하므로 서버에서 직접 로그인하는 방법을 권장합니다.

## 자주 쓰는 명령어

| 명령어 | 하는 일 |
| --- | --- |
| `/status` | 현재 Codex 잔여량을 즉시 조회합니다 |
| `/language` | 알림 언어를 선택합니다 |
| `/prime-on` | 5시간 prime을 켭니다 |
| `/prime-off` | 5시간 prime을 끕니다 |
| `/prime-status` | prime 설정 상태를 확인합니다 |
| `/login` | Telegram을 통한 ChatGPT 로그인을 시작합니다 |
| `/login_confirm` | 60초 안에 로그인 요청을 확인합니다 |
| `/help` | 사용할 수 있는 명령어를 표시합니다 |

## 언제 알림이 오나요?

봇은 기본적으로 20분마다 Codex 잔여량을 확인합니다.

- 잔여 퍼센트 또는 초기화 시각이 달라져야 자동 사용량 알림 대상이 됩니다.
- 자동 사용량 알림은 마지막 알림으로부터 기본 60분이 지난 뒤 보냅니다.
- 60분 동안 여러 변화가 생기면 가장 최신 상태만 한 번 보냅니다.
- 초기화 시각이 3분 이내로 흔들리는 것은 같은 값으로 취급합니다.
- 5시간 잔여량이 정확히 100%일 때 움직이는 초기화 시각은 사용이 시작될 때까지 무시합니다.
- `/status`는 기다리지 않고 현재 상태를 바로 보내며, 자동 알림 간격도 그 시점부터 다시 계산합니다.

### 새로운 reset 발표

사용량 조회가 성공하면 [Codex Resets](https://codex-resets.com)의 공개 API도 확인합니다. 마지막으로 확인한 reset ID와 다른 새 발표가 있을 때 별도 메시지를 한 번만 보냅니다. 외부 API가 일시적으로 실패해도 Codex 잔여량 조회는 계속 동작합니다.

Codex Resets는 커뮤니티 추적 정보이며 OpenAI의 공식 발표나 보장을 의미하지 않습니다.

## 5시간 prime 사용하기

일부 계정은 사용 전 5시간 초기화 시각이 조회할 때마다 움직입니다. prime을 켜면 5시간 잔여량의 실제 값이 정확히 100%일 때 Codex에 `1+1=?`를 한 번 보내 사용 주기를 시작하고, 잔여량을 다시 조회합니다.

Telegram에서 `/prime-on`을 보내거나 `.env`에 다음 값을 설정합니다.

```env
PRIME_FULL_USAGE=true
FULL_USAGE_PRIME_COOLDOWN_MINUTES=20
```

실행 알림은 다음처럼 표시됩니다.

```text
⏰ 5시간 잔여량: 100.00%
⚡ Prime 실행: Codex에 1+1 요청을 보냅니다.
```

prime은 기본적으로 꺼져 있으며 소량의 Codex 사용량을 소비합니다. 같은 주기에서 반복 요청하지 않도록 실행 상태를 저장하고, API 반영을 기다리는 최소 간격은 기본 20분입니다. `/prime-on`을 다시 보내면 저장된 prime 실행 상태가 초기화되어 다음 조회에서 다시 실행될 수 있습니다.

주간 잔여량, 리셋 쿠폰, Codex Resets 발표는 prime 실행 조건에 포함되지 않습니다.

## 설정 바꾸기

`.env`를 수정한 뒤 `docker compose up -d --force-recreate`를 실행하세요.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `POLL_INTERVAL_MINUTES` | `20` | Codex 잔여량 조회 간격 |
| `NOTIFICATION_MIN_INTERVAL_MINUTES` | `60` | 자동 사용량 알림의 최소 간격 |
| `RESET_TIME_TOLERANCE_MINUTES` | `3` | 무시할 초기화 시각 흔들림 |
| `PRIME_FULL_USAGE` | `false` | 5시간 prime 기본 설정 |
| `FULL_USAGE_PRIME_COOLDOWN_MINUTES` | `20` | prime 최소 재실행 간격 |
| `TZ` | `Asia/Seoul` | 알림에 표시할 시간대 |
| `REQUEST_TIMEOUT_SECONDS` | `30` | Codex·Telegram·reset API 요청 제한 시간 |
| `TELEGRAM_LONG_POLL_SECONDS` | `50` | Telegram 명령 대기 시간 |
| `CODEX_COMMAND` | `codex` | Codex 실행 파일 이름 또는 경로 |
| `IMAGE` | `wipoohyam/codex-usage-telegram:latest` | 실행할 컨테이너 이미지 |

Telegram에서 바꾼 prime 값은 재시작 후에도 유지되며 `.env`의 기본값보다 우선합니다.

## 업데이트와 운영

최신 버전으로 업데이트합니다.

```sh
git pull
docker compose pull
docker compose up -d --force-recreate
```

로그를 확인합니다.

```sh
docker compose logs --tail=100 codex-usage
```

버전을 고정하거나 롤백하려면 `.env`에 이미지 태그를 지정합니다.

```env
IMAGE=wipoohyam/codex-usage-telegram:<version>
```

봇만 중지하고 로그인과 상태를 유지하려면 다음 명령을 사용합니다.

```sh
docker compose down
```

저장된 로그인과 알림 상태까지 삭제할 의도가 아니라면 `docker compose down -v`를 실행하지 마세요. 변경 사항은 [CHANGELOG.md](CHANGELOG.md)에서 확인할 수 있습니다.

## 문제가 있을 때

- **`/status`에 응답이 없음:** 봇에게 먼저 메시지를 보냈는지, `TELEGRAM_CHAT_ID`가 그 개인 채팅의 숫자 ID인지 확인한 뒤 로그를 확인하세요.
- **ChatGPT 로그인이 만료됨:** `docker compose run --rm codex-usage login`을 다시 실행하세요.
- **설정 변경이 반영되지 않음:** `docker compose up -d --force-recreate`를 실행하세요.
- **한 번의 조회가 실패함:** 다음 자동 조회를 기다리거나 `/status`를 다시 보내세요.
- **reset 발표 조회만 실패함:** 외부 Codex Resets API 오류는 사용량 조회를 중단시키지 않습니다.

## 보안과 데이터

- `.env`와 장치 로그인 코드를 다른 사람에게 보여주지 마세요.
- 봇을 공개 그룹에 추가하지 마세요.
- 가능하면 Telegram 로그인보다 서버 로그인을 사용하세요.
- ChatGPT 인증 정보는 `codex-auth` 볼륨에, 알림 상태는 `codex-usage-data` 볼륨에 저장됩니다.
- 외부에서 들어오는 포트를 열지 않으며 Telegram 명령은 long polling으로 받습니다.

Codex 인증 방식은 OpenAI의 [공식 Codex 인증 문서](https://developers.openai.com/codex/auth)를 참고하세요.

## 개발 및 라이선스

```sh
npm test
npm run check
```

기여 방법은 [CONTRIBUTING.md](CONTRIBUTING.md), 보안 문제 제보는 [SECURITY.md](SECURITY.md)를 확인하세요.

MIT License
