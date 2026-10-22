export const SUPPORTED_LANGUAGES = ["ko", "en", "zh", "ja"];

const languageNames = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
};

const messages = {
  ko: {
    languageMenu: ({ current }) =>
      `🌐 알림 언어\n\n현재 언어: ${languageNames[current]}\n\n변경하려면 아래 명령 중 하나를 보내세요.\n/language ko — 한국어\n/language en — English\n/language zh — 中文\n/language ja — 日本語`,
    languageChanged: ({ language }) => `✅ 알림 언어 변경\n\n${languageNames[language]}로 변경했습니다.`,
    languageInvalid: "⚠️ 알림 언어 설정 오류\n\n지원 언어: ko(한국어), en(English), zh(中文), ja(日本語)",
    usageTitle: "📊 Codex 잔여 한도",
    noWindows: "사용량 정보를 받지 못했습니다.",
    remaining: "잔여",
    reset: "초기화",
    resetCredits: "🎟 리셋 쿠폰",
    unknown: "정보 없음",
    expires: "만료",
    checked: "조회",
    refreshHint: "🔄 새로고침: /status",
    loginWarningTitle: "⚠️ Codex 재로그인 보안 경고",
    loginWarningBody: "이 기능은 ChatGPT 장치 인증 URL과 일회용 코드를 이 개인 Telegram 채팅으로 전송합니다.",
    loginWarningShare: "코드를 받은 사람은 로그인 절차를 악용할 수 있으므로 메시지를 전달하거나 캡처해서 공유하지 마세요.",
    loginWarningConfirm: "계속하려면 60초 안에 /login_confirm 을 보내세요.",
    saferLogin: "더 안전한 방법: 서버에서 docker compose run --rm codex-usage login",
    loginInstruction: "아래 별도 메시지의 일회용 코드를 복사해 입력하세요.",
    loginTitle: "🔐 Codex 장치 로그인",
    loginCodeTitle: "🔑 Codex 로그인 인증 코드",
    loginCodeWarning: "⚠️ 이 코드를 누구에게도 전달하지 마세요.",
    loginDeleteNotice: "두 메시지는 로그인 완료 또는 약 10분 후 삭제됩니다.",
    reauthTitle: "🔐 Codex 재로그인이 필요합니다.",
    reauthBody: "개인 채팅에서 /login 을 보내거나 서버에서 다음 명령을 실행하세요:",
    reauthWarning: "⚠️ /login은 일회용 인증 코드가 Telegram을 통과합니다. 보안상 서버 명령 사용을 권장합니다.",
    statusFailure: ({ detail }) => `⚠️ Codex 사용량 조회 실패\n\n${detail}`,
    loginPrivateOnly: "🔒 Codex 로그인 제한\n\n/login은 보안을 위해 Telegram 개인 채팅에서만 사용할 수 있습니다.",
    loginActive: "⏳ Codex 로그인 진행 중\n\n이미 ChatGPT 로그인이 진행 중입니다.",
    loginCooldown: "⏳ Codex 로그인 재시도 대기\n\n이전 시도 후 10분이 지나야 가능합니다.",
    loginExpired: "⌛ Codex 로그인 확인 만료\n\n/login부터 다시 보내세요.",
    loginRequesting: "🔐 Codex 로그인 정보 요청 중\n\n장치 로그인 정보를 요청하고 있습니다…",
    loginSuccess: "✅ Codex 로그인 완료\n\n사용량을 다시 확인합니다.",
    loginUsageFailure: ({ detail }) => `⚠️ 로그인 후 사용량 조회 실패\n\nChatGPT 로그인은 완료되었습니다.\n${detail}`,
    loginFailure: ({ detail }) => `❌ ChatGPT 로그인 실패\n\n${detail}`,
    primeStarted: ({ remainingPercent }) =>
      `⚡ Prime 실행\n\n⏰ 5시간 잔여량: ${remainingPercent}%\nCodex에 1+1 요청을 보냅니다.`,
    primeFailed: ({ detail }) => `⚠️ Prime 실행 실패\n\n${detail}`,
    primeEnabled: "✅ Prime 켜짐\n\n5시간 prime(1+1 전송)을 켰습니다.",
    primeDisabled: "⏸ Prime 꺼짐\n\n5시간 prime(1+1 전송)을 껐습니다.",
    primeStatus: ({ enabled, source }) =>
      `⚙️ Prime 설정\n\n5시간 prime: ${enabled ? "켜짐" : "꺼짐"}\n설정 출처: ${source === "env" ? "환경변수" : "Telegram 명령"}\n\n변경: /prime-on 또는 /prime-off`,
    externalResetTypeRegular: "정기 reset",
    externalResetTypeBanked: "banked reset 쿠폰",
    externalResetScheduledAlert: ({ resetType, announcedAt, scheduledFor, text, sourceUrl, siteUrl }) =>
      `📅 Codex reset 예고\n\n예정: ${scheduledFor}\n종류: ${resetType}\n발표: ${announcedAt}\n내용: ${text}\n출처: ${sourceUrl}\n데이터 제공: ${siteUrl}\n\n⚠️ 커뮤니티 추적 정보이며 OpenAI의 공식 확정 정보가 아닙니다.`,
    externalResetAlert: ({ resetType, announcedAt, text, sourceUrl, siteUrl }) =>
      `🔔 새로운 Codex reset 감지\n\n종류: ${resetType}\n발표: ${announcedAt}\n내용: ${text}\n출처: ${sourceUrl}\n데이터 제공: ${siteUrl}\n\n⚠️ 커뮤니티 추적 정보이며 OpenAI의 공식 확정 정보가 아닙니다.`,
    help: "📖 Codex 사용 가능한 명령어\n\n/status - 지금 사용량 조회\n/prime-on - 5시간 prime(1+1 전송) 켜기\n/prime-off - 5시간 prime 끄기\n/prime-status - prime 설정 확인\n/login - ChatGPT 재로그인 시작\n/login_confirm - 보안 경고 확인 후 60초 안에 로그인 계속\n/language - 현재 알림 언어 및 변경 방법\n/language ko - 한국어\n/language en - English\n/language zh - 中文\n/language ja - 日本語\n/help - 전체 명령어 보기\n/start - 봇 안내 및 전체 명령어 보기\n\n지원 별칭\n/lang - /language와 동일(예: /lang en)\n언어 코드 대신 한국어, English, 中文, 日本語도 사용 가능\n/login-confirm 또는 /login confirm - /login_confirm과 동일\n\nreset 발표와 사전 예고는 자동으로 수신합니다.",
  },
  en: {
    languageMenu: ({ current }) =>
      `🌐 Notification language\n\nCurrent: ${languageNames[current]}\n\nSend one of these commands to change it.\n/language ko — 한국어\n/language en — English\n/language zh — 中文\n/language ja — 日本語`,
    languageChanged: ({ language }) => `✅ Notification language changed\n\nSelected: ${languageNames[language]}.`,
    languageInvalid: "⚠️ Notification language error\n\nSupported languages: ko (한국어), en (English), zh (中文), ja (日本語)",
    usageTitle: "📊 Codex Remaining Limits",
    noWindows: "No usage information was returned.",
    remaining: "remaining",
    reset: "Reset",
    resetCredits: "🎟 Reset credits",
    unknown: "Unknown",
    expires: "Expires",
    checked: "Checked",
    refreshHint: "🔄 Refresh: /status",
    loginWarningTitle: "⚠️ Codex reauthentication warning",
    loginWarningBody: "This sends a ChatGPT device-auth URL and one-time code to this private Telegram chat.",
    loginWarningShare: "Anyone with the code may abuse the login flow. Do not forward or capture it.",
    loginWarningConfirm: "To continue, send /login_confirm within 60 seconds.",
    saferLogin: "Safer option: run docker compose run --rm codex-usage login on the server.",
    loginInstruction: "Copy the one-time code from the separate message and enter it.",
    loginTitle: "🔐 Codex device login",
    loginCodeTitle: "🔑 Codex login verification code",
    loginCodeWarning: "⚠️ Do not share this code with anyone.",
    loginDeleteNotice: "Both messages are deleted after login completes or after about 10 minutes.",
    reauthTitle: "🔐 Codex reauthentication is required.",
    reauthBody: "Send /login in this private chat, or run this command on the server:",
    reauthWarning: "⚠️ /login sends a one-time code through Telegram. Server-side login is safer.",
    statusFailure: ({ detail }) => `⚠️ Codex usage check failed\n\n${detail}`,
    loginPrivateOnly: "🔒 Codex login restricted\n\n/login is available only in a private Telegram chat.",
    loginActive: "⏳ Codex login in progress\n\nA ChatGPT login is already in progress.",
    loginCooldown: "⏳ Codex login retry pending\n\nPlease wait 10 minutes after the previous login attempt.",
    loginExpired: "⌛ Codex login confirmation expired\n\nSend /login again.",
    loginRequesting: "🔐 Codex login details requested\n\nRequesting device login details…",
    loginSuccess: "✅ Codex login completed\n\nChecking usage again.",
    loginUsageFailure: ({ detail }) => `⚠️ Usage check after login failed\n\nChatGPT login completed.\n${detail}`,
    loginFailure: ({ detail }) => `❌ ChatGPT login failed\n\n${detail}`,
    primeStarted: ({ remainingPercent }) =>
      `⚡ Prime started\n\n⏰ Five-hour remaining: ${remainingPercent}%\nSending a 1+1 request to Codex.`,
    primeFailed: ({ detail }) => `⚠️ Prime failed\n\n${detail}`,
    primeEnabled: "✅ Prime enabled\n\nFive-hour prime (1+1 request) is now enabled.",
    primeDisabled: "⏸ Prime disabled\n\nFive-hour prime (1+1 request) is now disabled.",
    primeStatus: ({ enabled, source }) =>
      `⚙️ Prime settings\n\nFive-hour prime: ${enabled ? "ON" : "OFF"}\nSetting source: ${source === "env" ? "environment" : "Telegram command"}\n\nChange it with /prime-on or /prime-off`,
    externalResetTypeRegular: "regular reset",
    externalResetTypeBanked: "banked reset credit",
    externalResetScheduledAlert: ({ resetType, announcedAt, scheduledFor, text, sourceUrl, siteUrl }) =>
      `📅 Codex reset scheduled\n\nExpected: ${scheduledFor}\nType: ${resetType}\nAnnounced: ${announcedAt}\nDetails: ${text}\nSource: ${sourceUrl}\nData from: ${siteUrl}\n\n⚠️ Community-tracked information, not an official OpenAI commitment.`,
    externalResetAlert: ({ resetType, announcedAt, text, sourceUrl, siteUrl }) =>
      `🔔 New Codex reset detected\n\nType: ${resetType}\nAnnounced: ${announcedAt}\nDetails: ${text}\nSource: ${sourceUrl}\nData from: ${siteUrl}\n\n⚠️ Community-tracked information, not an official OpenAI commitment.`,
    help: "📖 Codex available commands\n\n/status - Check usage now\n/prime-on - Enable five-hour prime (1+1 request)\n/prime-off - Disable five-hour prime\n/prime-status - Show prime settings\n/login - Start ChatGPT reauthentication\n/login_confirm - Accept the warning and continue within 60 seconds\n/language - Show current notification language and options\n/language ko - 한국어\n/language en - English\n/language zh - 中文\n/language ja - 日本語\n/help - Show all commands\n/start - Show bot information and all commands\n\nSupported aliases\n/lang - Same as /language (example: /lang en)\nLanguage names 한국어, English, 中文, 日本語 also work instead of codes\n/login-confirm or /login confirm - Same as /login_confirm\n\nReset announcements and advance notices arrive automatically.",
  },
  zh: {
    languageMenu: ({ current }) =>
      `🌐 通知语言\n\n当前语言：${languageNames[current]}\n\n发送以下命令切换语言。\n/language ko — 한국어\n/language en — English\n/language zh — 中文\n/language ja — 日本語`,
    languageChanged: ({ language }) => `✅ 通知语言已更改\n\n已切换为${languageNames[language]}。`,
    languageInvalid: "⚠️ 通知语言设置错误\n\n支持的语言：ko（한국어）、en（English）、zh（中文）、ja（日本語）",
    usageTitle: "📊 Codex 剩余额度",
    noWindows: "未收到用量信息。",
    remaining: "剩余",
    reset: "重置",
    resetCredits: "🎟 重置额度",
    unknown: "未知",
    expires: "到期",
    checked: "查询时间",
    refreshHint: "🔄 刷新：/status",
    loginWarningTitle: "⚠️ Codex 重新登录安全提示",
    loginWarningBody: "此功能会将 ChatGPT 设备认证链接和一次性代码发送到此私人 Telegram 聊天。",
    loginWarningShare: "持有代码的人可能滥用登录流程。请勿转发或截图分享。",
    loginWarningConfirm: "如要继续，请在 60 秒内发送 /login_confirm。",
    saferLogin: "更安全的方式：在服务器运行 docker compose run --rm codex-usage login。",
    loginInstruction: "请复制下一条单独消息中的一次性代码并输入。",
    loginTitle: "🔐 Codex 设备登录",
    loginCodeTitle: "🔑 Codex 登录验证码",
    loginCodeWarning: "⚠️ 请勿将此代码分享给任何人。",
    loginDeleteNotice: "登录完成或约 10 分钟后，两条消息都会被删除。",
    reauthTitle: "🔐 需要重新登录 Codex。",
    reauthBody: "请在私人聊天中发送 /login，或在服务器运行以下命令：",
    reauthWarning: "⚠️ /login 会让一次性代码经过 Telegram。建议使用服务器登录。",
    statusFailure: ({ detail }) => `⚠️ Codex 用量查询失败\n\n${detail}`,
    loginPrivateOnly: "🔒 Codex 登录限制\n\n为了安全，/login 只能在 Telegram 私人聊天中使用。",
    loginActive: "⏳ Codex 登录进行中\n\nChatGPT 登录已经在进行中。",
    loginCooldown: "⏳ Codex 登录重试等待中\n\n上次登录尝试后请等待 10 分钟。",
    loginExpired: "⌛ Codex 登录确认已过期\n\n请重新发送 /login。",
    loginRequesting: "🔐 Codex 登录信息请求中\n\n正在请求设备登录信息…",
    loginSuccess: "✅ Codex 登录完成\n\n正在重新查询用量。",
    loginUsageFailure: ({ detail }) => `⚠️ 登录后用量查询失败\n\nChatGPT 登录已完成。\n${detail}`,
    loginFailure: ({ detail }) => `❌ ChatGPT 登录失败\n\n${detail}`,
    primeStarted: ({ remainingPercent }) =>
      `⚡ Prime 执行\n\n⏰ 五小时剩余额度：${remainingPercent}%\n正在向 Codex 发送 1+1 请求。`,
    primeFailed: ({ detail }) => `⚠️ Prime 执行失败\n\n${detail}`,
    primeEnabled: "✅ Prime 已开启\n\n已开启五小时 prime（发送 1+1 请求）。",
    primeDisabled: "⏸ Prime 已关闭\n\n已关闭五小时 prime（发送 1+1 请求）。",
    primeStatus: ({ enabled, source }) =>
      `⚙️ Prime 设置\n\n五小时 prime：${enabled ? "开启" : "关闭"}\n设置来源：${source === "env" ? "环境变量" : "Telegram 命令"}\n\n使用 /prime-on 或 /prime-off 修改`,
    externalResetTypeRegular: "常规 reset",
    externalResetTypeBanked: "banked reset 额度",
    externalResetScheduledAlert: ({ resetType, announcedAt, scheduledFor, text, sourceUrl, siteUrl }) =>
      `📅 Codex reset 预告\n\n预计时间：${scheduledFor}\n类型：${resetType}\n公布时间：${announcedAt}\n内容：${text}\n来源：${sourceUrl}\n数据提供：${siteUrl}\n\n⚠️ 这是社区追踪信息，并非 OpenAI 官方承诺。`,
    externalResetAlert: ({ resetType, announcedAt, text, sourceUrl, siteUrl }) =>
      `🔔 检测到新的 Codex reset\n\n类型：${resetType}\n公布时间：${announcedAt}\n内容：${text}\n来源：${sourceUrl}\n数据提供：${siteUrl}\n\n⚠️ 这是社区追踪信息，并非 OpenAI 官方承诺。`,
    help: "📖 Codex 可用命令\n\n/status - 立即查询用量\n/prime-on - 开启五小时 prime（发送 1+1 请求）\n/prime-off - 关闭五小时 prime\n/prime-status - 查看 prime 设置\n/login - 开始 ChatGPT 重新登录\n/login_confirm - 接受安全提示并在 60 秒内继续登录\n/language - 显示当前通知语言和选项\n/language ko - 한국어\n/language en - English\n/language zh - 中文\n/language ja - 日本語\n/help - 显示所有命令\n/start - 显示机器人说明及所有命令\n\n支持的别名\n/lang - 与 /language 相同（例如：/lang en）\n也可使用语言名称 한국어、English、中文、日本語代替代码\n/login-confirm 或 /login confirm - 与 /login_confirm 相同\n\nreset 公告和预告会自动发送。",
  },
  ja: {
    languageMenu: ({ current }) =>
      `🌐 通知言語\n\n現在：${languageNames[current]}\n\n以下のコマンドで変更できます。\n/language ko — 한국어\n/language en — English\n/language zh — 中文\n/language ja — 日本語`,
    languageChanged: ({ language }) => `✅ 通知言語を変更\n\n${languageNames[language]}に変更しました。`,
    languageInvalid: "⚠️ 通知言語の設定エラー\n\n対応言語：ko（한국어）、en（English）、zh（中文）、ja（日本語）",
    usageTitle: "📊 Codex 残り上限",
    noWindows: "使用量情報を取得できませんでした。",
    remaining: "残り",
    reset: "リセット",
    resetCredits: "🎟 リセットクーポン",
    unknown: "不明",
    expires: "有効期限",
    checked: "確認",
    refreshHint: "🔄 更新：/status",
    loginWarningTitle: "⚠️ Codex 再ログインのセキュリティ警告",
    loginWarningBody: "この機能は ChatGPT のデバイス認証 URL とワンタイムコードを、この非公開 Telegram チャットに送信します。",
    loginWarningShare: "コードを知る人がログインを悪用できます。転送やスクリーンショットの共有はしないでください。",
    loginWarningConfirm: "続行するには 60 秒以内に /login_confirm を送信してください。",
    saferLogin: "より安全な方法：サーバーで docker compose run --rm codex-usage login を実行してください。",
    loginInstruction: "次の別メッセージにあるワンタイムコードをコピーして入力してください。",
    loginTitle: "🔐 Codex デバイスログイン",
    loginCodeTitle: "🔑 Codex ログイン認証コード",
    loginCodeWarning: "⚠️ このコードを他人に共有しないでください。",
    loginDeleteNotice: "ログイン完了または約 10 分後に、2 つのメッセージを削除します。",
    reauthTitle: "🔐 Codex の再ログインが必要です。",
    reauthBody: "非公開チャットで /login を送るか、サーバーで次のコマンドを実行してください：",
    reauthWarning: "⚠️ /login ではワンタイムコードが Telegram を経由します。サーバーでのログインを推奨します。",
    statusFailure: ({ detail }) => `⚠️ Codex 使用量の確認に失敗\n\n${detail}`,
    loginPrivateOnly: "🔒 Codex ログインの制限\n\n/login は Telegram の非公開チャットでのみ使用できます。",
    loginActive: "⏳ Codex ログイン進行中\n\nChatGPT のログインはすでに進行中です。",
    loginCooldown: "⏳ Codex ログイン再試行の待機中\n\n前回のログイン試行から 10 分待ってください。",
    loginExpired: "⌛ Codex ログイン確認の有効期限切れ\n\n/login をもう一度送信してください。",
    loginRequesting: "🔐 Codex ログイン情報を取得中\n\nデバイスログイン情報をリクエストしています…",
    loginSuccess: "✅ Codex ログイン完了\n\n使用量を再確認します。",
    loginUsageFailure: ({ detail }) => `⚠️ ログイン後の使用量確認に失敗\n\nChatGPT のログインは完了しました。\n${detail}`,
    loginFailure: ({ detail }) => `❌ ChatGPT のログインに失敗しました\n\n${detail}`,
    primeStarted: ({ remainingPercent }) =>
      `⚡ Prime 実行\n\n⏰ 5時間の残量：${remainingPercent}%\nCodex に 1+1 リクエストを送信します。`,
    primeFailed: ({ detail }) => `⚠️ Prime 実行失敗\n\n${detail}`,
    primeEnabled: "✅ Prime オン\n\n5時間 prime（1+1 リクエスト）をオンにしました。",
    primeDisabled: "⏸ Prime オフ\n\n5時間 prime（1+1 リクエスト）をオフにしました。",
    primeStatus: ({ enabled, source }) =>
      `⚙️ Prime 設定\n\n5時間 prime：${enabled ? "オン" : "オフ"}\n設定元：${source === "env" ? "環境変数" : "Telegram コマンド"}\n\n/prime-on または /prime-off で変更できます`,
    externalResetTypeRegular: "通常 reset",
    externalResetTypeBanked: "banked reset クレジット",
    externalResetScheduledAlert: ({ resetType, announcedAt, scheduledFor, text, sourceUrl, siteUrl }) =>
      `📅 Codex reset 予告\n\n予定：${scheduledFor}\n種類：${resetType}\n発表：${announcedAt}\n内容：${text}\n出典：${sourceUrl}\nデータ提供：${siteUrl}\n\n⚠️ コミュニティによる追跡情報であり、OpenAI の公式な確約ではありません。`,
    externalResetAlert: ({ resetType, announcedAt, text, sourceUrl, siteUrl }) =>
      `🔔 新しい Codex reset を検出\n\n種類：${resetType}\n発表：${announcedAt}\n内容：${text}\n出典：${sourceUrl}\nデータ提供：${siteUrl}\n\n⚠️ コミュニティによる追跡情報であり、OpenAI の公式な確約ではありません。`,
    help: "📖 Codex 利用可能なコマンド\n\n/status - 使用量を今すぐ確認\n/prime-on - 5時間 prime（1+1 リクエスト）をオン\n/prime-off - 5時間 prime をオフ\n/prime-status - prime 設定を確認\n/login - ChatGPT 再ログインを開始\n/login_confirm - 警告を確認し 60 秒以内にログインを続行\n/language - 現在の通知言語と選択肢を表示\n/language ko - 한국어\n/language en - English\n/language zh - 中文\n/language ja - 日本語\n/help - 全コマンドを表示\n/start - ボットの案内と全コマンドを表示\n\n対応する別名\n/lang - /language と同じ（例：/lang en）\n言語コードの代わりに 한국어、English、中文、日本語 も使用可能\n/login-confirm または /login confirm - /login_confirm と同じ\n\nreset の発表と予告は自動的に届きます。",
  },
};

export function normalizeLanguage(value) {
  const language = String(value || "").toLowerCase();
  return SUPPORTED_LANGUAGES.includes(language) ? language : "ko";
}

export function languageName(language) {
  return languageNames[normalizeLanguage(language)];
}

export function translate(language, key, variables = {}) {
  const selected = messages[normalizeLanguage(language)] || messages.ko;
  const value = selected[key] ?? messages.ko[key] ?? key;
  return typeof value === "function" ? value(variables) : value;
}
