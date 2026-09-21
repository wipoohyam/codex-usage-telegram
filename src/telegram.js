export async function sendTelegramMessage(
  { token, chatId, text, timeoutMs = 30_000 },
  fetchImpl = fetch,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const description = payload?.description || `HTTP ${response.status}`;
      throw new Error(`Telegram send failed: ${description}`);
    }
    return payload.result;
  } finally {
    clearTimeout(timer);
  }
}
