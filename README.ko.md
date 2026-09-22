# Codex Usage Telegram

[English](README.md) | [한국어](README.ko.md)

ChatGPT Codex 사용량 한도와 적립된 리셋 크레딧을 텔레그램으로 알려주는 셀프 호스팅 도구입니다. ChatGPT 인증 정보와 텔레그램 봇 토큰은 사용자의 서버에만 보관됩니다.

이 모니터는 공식 Codex App Server를 통해 계정 메타데이터를 조회합니다. 모델을 호출하지 않으며 OpenAI API 키도 필요하지 않습니다.

## 주요 기능

- 반환된 모든 사용량 구간의 잔여 비율과 초기화 시각 표시
- 구간 길이를 기준으로 5시간 및 주간 한도 식별
- 적립된 리셋 크레딧 수와 확인 가능한 가장 가까운 만료 시각 표시
- 기본 90분 간격 조회
- 텔레그램 롱 폴링을 통한 `/status` 즉시 조회
- Codex 인증 만료 시 전용 재로그인 알림 전송
- 개인 텔레그램 채팅에서 확인 절차를 거친 `/login` 장치 코드 로그인 지원
- 공개 포트, 웹훅, 도메인 및 웹 서버 불필요
- 매번 알림 전송 또는 변경된 경우에만 전송
- 중복 오류 알림 억제
- 비공개 Docker 볼륨에 ChatGPT 인증 정보 저장
- 런타임에서 Node.js 기본 모듈만 사용

## Docker Compose로 빠르게 시작하기

준비물: Docker Compose와 [@BotFather](https://t.me/BotFather)에서 발급받은 텔레그램 봇 토큰

1. 저장소를 복제하고 설정 파일을 만듭니다.

   ```sh
   cp .env.example .env
   ```

2. `.env`에 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`를 입력합니다. 채팅 ID를 확인하려면 봇에게 메시지를 보낸 후 다음 주소를 엽니다.

   ```text
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

3. 배포된 이미지를 내려받습니다.

   ```sh
   docker compose pull
   ```

   기본 이미지는 Docker Hub의 `wipoohyam/codex-usage-telegram:latest`입니다. 같은 이미지를 `ghcr.io/wipoohyam/codex-usage-telegram:latest`에서도 제공합니다.

   같은 이미지를 로컬에서 직접 만들려면 `docker compose build`를 실행합니다.

4. 장치 코드를 사용해 ChatGPT에 로그인합니다. 필요한 경우 먼저 ChatGPT 보안 설정에서 장치 코드 로그인을 활성화합니다.

   ```sh
   docker compose run --rm monitor login
   ```

5. 알림을 한 번 시험 전송합니다.

   ```sh
   docker compose run --rm monitor once
   ```

6. 모니터를 시작합니다.

   ```sh
   docker compose up -d
   ```

즉시 사용량을 확인하려면 봇에게 `/status`를 보내세요. `/start`와 `/help`로 사용 가능한 명령어를 확인할 수 있습니다. 이 봇에서 웹훅을 사용한 적이 있다면 롱 폴링을 사용하기 전에 웹훅을 제거해야 합니다.

### 텔레그램 로그인

인증이 만료되면 봇은 더 안전한 서버 측 로그인 명령어와 함께 재로그인 알림을 보냅니다. 설정한 개인 채팅에서 장치 코드 로그인을 시작할 수도 있습니다.

1. `/login`을 보내고 보안 경고를 확인합니다.
2. 60초 안에 `/login confirm`을 보냅니다.
3. 인증 주소를 열고 일회용 코드를 입력합니다.

개인 채팅에서만 사용할 수 있습니다. 한 번에 하나의 로그인만 진행할 수 있고 시도 후 10분의 대기 시간이 적용됩니다. 장치 코드 메시지는 텔레그램 스포일러로 가려지고 콘텐츠 보호가 활성화되며, 성공·실패 또는 10분 제한 시간 경과 후 삭제됩니다.

장치 코드는 피싱에 악용될 수 있는 민감한 정보입니다. 텔레그램이 코드를 전송하고 일시적으로 저장하므로 다음 서버 측 방식을 권장합니다.

```sh
docker compose run --rm monitor login
```

`codex-auth` 볼륨에는 액세스 토큰이 들어 있습니다. 비밀번호처럼 취급하고 공개하지 말아야 하며, 서버 백업도 안전하게 보호하세요.

## 설정

| 변수 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | 예 | — | 텔레그램 봇 토큰 |
| `TELEGRAM_CHAT_ID` | 예 | — | 알림을 받을 채팅 또는 채널 ID |
| `POLL_INTERVAL_MINUTES` | 아니요 | `90` | 조회 성공 및 실패 후 다음 조회까지의 시간 |
| `TZ` | 아니요 | `Asia/Seoul` | 메시지에 사용할 IANA 시간대 |
| `NOTIFY_MODE` | 아니요 | `always` | `always` 또는 `changes` |
| `REQUEST_TIMEOUT_SECONDS` | 아니요 | `30` | Codex 및 텔레그램 요청 제한 시간 |
| `TELEGRAM_LONG_POLL_SECONDS` | 아니요 | `50` | 텔레그램 명령 롱 폴링 시간 |
| `CODEX_COMMAND` | 아니요 | `codex` | Codex 실행 파일 경로 |
| `STATE_FILE` | 아니요 | `data/state.json` | 중복 방지를 위한 로컬 상태 파일 |

## Docker 없이 실행하기

Node.js 20 이상과 Codex CLI를 설치한 후 다음 명령을 실행합니다.

```sh
npm install --global @openai/codex
cp .env.example .env
codex login --device-auth
```

셸이나 서비스 관리자를 사용해 `.env`의 환경변수를 불러온 다음 `npm start`를 실행합니다. 런타임 의존성을 두지 않기 위해 이 프로젝트는 `.env` 파일을 직접 읽지 않습니다.

## 보안 구조

- App Server는 표준 입출력을 통한 로컬 JSONL 통신만 사용하며 네트워크 포트를 열지 않습니다.
- 텔레그램 명령은 외부로 나가는 HTTPS 롱 폴링을 사용합니다. 설정된 `TELEGRAM_CHAT_ID`에서 온 명령만 허용합니다.
- 텔레그램 `/login`은 명시적 확인이 필요하고 개인 채팅에서만 작동합니다. 로그인 시도 횟수를 제한하고, 코드를 스포일러로 가리며, 텔레그램 콘텐츠 보호를 활성화하고, 절차가 끝나면 코드 메시지를 삭제합니다.
- 텔레그램 장치 코드 로그인은 서버에서 직접 로그인 명령을 실행하는 것보다 안전성이 낮습니다. 일회용 코드가 텔레그램을 통과한다는 점을 이해한 경우에만 사용하세요.
- 상태 메시지나 애플리케이션 로그에 비밀값을 포함하지 않습니다.
- `.env`, 로컬 상태 및 Codex 인증 경로는 Git에서 제외됩니다.
- 사용량 모니터링은 읽기 전용 계정 메서드를 호출합니다. 명시적으로 실행한 `/login` 절차는 저장된 인증 정보를 갱신할 수 있지만, 애플리케이션은 리셋 크레딧을 사용하지 않습니다.
- Docker 컨테이너는 권한이 제한된 `node` 사용자로 실행됩니다.

운영체제 자격 증명 저장소를 사용할 수 없으면 Codex가 인증 정보를 `auth.json`에 저장할 수 있습니다. 이에 맞게 Docker 볼륨을 보호하세요. 자세한 내용은 [공식 인증 문서](https://learn.chatgpt.com/docs/auth#credential-storage)를 참고하세요.

## 개발

```sh
npm run check
npm test
docker build -t codex-usage-telegram:test .
```

## 면책 조항

이 프로젝트는 독립적인 오픈 소스 프로젝트이며 OpenAI 또는 Telegram과 제휴 관계가 없고 이들로부터 보증받지 않습니다. Codex App Server 스키마는 변경될 수 있으므로 이미지 버전을 고정하고 업그레이드 전에 릴리스 내용을 확인하세요.

## 라이선스

MIT
