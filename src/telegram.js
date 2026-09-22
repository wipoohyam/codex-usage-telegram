export async function sendTelegramMessage(
  { token, chatId, text, timeoutMs = 30_000, entities, protectContent = false },
  fetchImpl = fetch,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        ...(entities?.length ? { entities } : {}),
        ...(protectContent ? { protect_content: true } : {}),
      }),
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

export async function getTelegramUpdates(
  { token, offset, timeoutSeconds = 50, requestTimeoutMs = 60_000 },
  fetchImpl = fetch,
) {
  const controller = new AbortController();
  const effectiveTimeoutMs = Math.max(requestTimeoutMs, (timeoutSeconds + 10) * 1_000);
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  try {
    const query = new URLSearchParams({
      timeout: String(timeoutSeconds),
      allowed_updates: JSON.stringify(["message"]),
    });
    if (offset !== undefined && offset !== null) query.set("offset", String(offset));

    const response = await fetchImpl(
      `https://api.telegram.org/bot${token}/getUpdates?${query.toString()}`,
      { signal: controller.signal },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const description = payload?.description || `HTTP ${response.status}`;
      throw new Error(`Telegram updates failed: ${description}`);
    }
    return Array.isArray(payload.result) ? payload.result : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteTelegramMessage(
  { token, chatId, messageId, timeoutMs = 30_000 },
  fetchImpl = fetch,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const description = payload?.description || `HTTP ${response.status}`;
      throw new Error(`Telegram delete failed: ${description}`);
    }
    return payload.result;
  } finally {
    clearTimeout(timer);
  }
}
