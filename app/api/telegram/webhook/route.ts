import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { deleteGeneration, getGeneration } from '@/lib/db/queries';
import { answerCallback, editAlertResolved } from '@/lib/telegram';

export const runtime = 'nodejs';

type CallbackQuery = {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number | string } };
  from?: { id: number; username?: string; first_name?: string };
};

type Update = {
  callback_query?: CallbackQuery;
};

export async function POST(req: Request): Promise<Response> {
  // Telegram sends the secret in this header — reject anyone else.
  const provided = req.headers.get('x-telegram-bot-api-secret-token');
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || provided !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cb = update.callback_query;
  if (!cb || !cb.data || !cb.message || !cb.from) {
    // Anything that's not an inline-button press is silently OK'd —
    // Telegram resends until it sees a 2xx.
    return NextResponse.json({ ok: true });
  }

  const [action, itemId] = cb.data.split(':', 2);
  if (!action || !itemId || (action !== 'del' && action !== 'dis')) {
    await answerCallback(cb.id, 'Unknown action');
    return NextResponse.json({ ok: true });
  }

  const moderator =
    cb.from.username ? `@${cb.from.username}` : cb.from.first_name ?? `id:${cb.from.id}`;

  if (action === 'dis') {
    await editAlertResolved({
      chatId: cb.message.chat.id,
      messageId: cb.message.message_id,
      outcome: 'dismissed',
      by: moderator
    });
    await answerCallback(cb.id, 'Dismissed');
    return NextResponse.json({ ok: true });
  }

  // action === 'del'
  try {
    const item = await getGeneration(itemId);
    if (item) {
      // Best-effort blob cleanup — delete operation must continue even
      // if a blob is already gone or the token is missing in this env.
      await Promise.allSettled([
        item.preview_url ? del(item.preview_url) : Promise.resolve(),
        item.thumbnail_url ? del(item.thumbnail_url) : Promise.resolve()
      ]);
      await deleteGeneration(itemId);
    }
    await editAlertResolved({
      chatId: cb.message.chat.id,
      messageId: cb.message.message_id,
      outcome: 'deleted',
      by: moderator
    });
    await answerCallback(cb.id, 'Deleted');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    console.error('[telegram webhook delete]', message);
    await answerCallback(cb.id, `Error: ${message.slice(0, 60)}`);
  }
  return NextResponse.json({ ok: true });
}
