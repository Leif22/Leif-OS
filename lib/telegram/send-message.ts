/** Antwort im privaten Chat (Bot-Token nur serverseitig). */
export async function sendTelegramChatMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.warn("[telegram] sendMessage skipped: TELEGRAM_BOT_TOKEN missing");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[telegram] sendMessage failed", res.status, body.slice(0, 500));
  }
}
