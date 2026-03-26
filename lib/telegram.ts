const TELEGRAM_API = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken: string,
  replyMarkup?: object
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export function createInlineKeyboard(
  buttons: Array<Array<{ text: string; callback_data: string }>>
) {
  return { inline_keyboard: buttons };
}
