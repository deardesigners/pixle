/**
 * Thin wrapper over the Telegram Bot HTTP API for the moderation flow.
 *
 * Required env vars (set in Vercel):
 *   TELEGRAM_BOT_TOKEN     — from @BotFather
 *   TELEGRAM_CHAT_ID       — chat to receive report alerts
 *   TELEGRAM_WEBHOOK_SECRET — random string used to validate inbound callbacks
 *
 * One-time webhook registration (after env vars are deployed):
 *   curl -F "url=https://pixle.art/api/telegram/webhook" \
 *        -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
 *        "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
 */

const API_BASE = 'https://api.telegram.org';

type CallbackButton = { text: string; callback_data: string };

function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return t;
}

function chatId(): string {
  const c = process.env.TELEGRAM_CHAT_ID;
  if (!c) throw new Error('TELEGRAM_CHAT_ID not set');
  return c;
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_CHAT_ID &&
      process.env.TELEGRAM_WEBHOOK_SECRET
  );
}

async function call<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Telegram ${method} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function sendReportAlert(args: {
  itemId: string;
  styleId: string;
  thumbnailUrl: string | null;
  reporterClientId: string;
}): Promise<{ messageId: number }> {
  const url = `https://pixle.art/g/${args.itemId}`;
  const text =
    `🚩 <b>Report</b>\n` +
    `ID: <code>${args.itemId}</code>\n` +
    `Style: ${escapeHtml(args.styleId)}\n` +
    `Reporter: <code>${args.reporterClientId.slice(0, 8)}…</code>\n` +
    `<a href="${url}">${url}</a>`;
  const buttons: CallbackButton[][] = [
    [
      { text: '🗑 Delete', callback_data: `del:${args.itemId}` },
      { text: '✅ Dismiss', callback_data: `dis:${args.itemId}` }
    ]
  ];

  type SendResult = { result: { message_id: number } };
  // Photo with caption gives the moderator an immediate visual; if no
  // thumbnail is available fall back to a plain message with the link.
  if (args.thumbnailUrl) {
    const result = await call<SendResult>('sendPhoto', {
      chat_id: chatId(),
      photo: args.thumbnailUrl,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons }
    });
    return { messageId: result.result.message_id };
  }
  const result = await call<SendResult>('sendMessage', {
    chat_id: chatId(),
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
    disable_web_page_preview: false
  });
  return { messageId: result.result.message_id };
}

export async function editAlertResolved(args: {
  chatId: string | number;
  messageId: number;
  outcome: 'deleted' | 'dismissed';
  by: string;
}): Promise<void> {
  const tag = args.outcome === 'deleted' ? '🗑 Deleted' : '✅ Dismissed';
  const text = `${tag} by ${escapeHtml(args.by)}`;
  // Editing the caption works for sendPhoto; for sendMessage we need editMessageText.
  // Try caption first; fall back to text on the "no caption" Telegram error.
  try {
    await call('editMessageCaption', {
      chat_id: args.chatId,
      message_id: args.messageId,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }
    });
  } catch {
    await call('editMessageText', {
      chat_id: args.chatId,
      message_id: args.messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] }
    });
  }
}

export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text ?? '',
    show_alert: false
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
