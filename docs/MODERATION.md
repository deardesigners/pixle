# Gallery moderation via Telegram

Reports flow into a Telegram chat with **🗑 Delete** / **✅ Dismiss** buttons.
Tapping a button calls back into Pixle and either removes the gallery item
(plus its blob files) or marks the alert as dismissed.

## One-time setup

1. **Create the bot.** In Telegram, talk to `@BotFather` → `/newbot` → save the
   token that's printed (`123456:ABC-DEF…`).
2. **Find the chat ID.** Send any message to your bot, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser. Look for
   `chat.id` in the JSON. Use the numeric id (negative for groups, positive
   for private chats).
3. **Generate a webhook secret.** Any random 32+ char string works:
   `openssl rand -hex 32`.
4. **Set Vercel env vars** (`Settings → Environment Variables`):
   - `TELEGRAM_BOT_TOKEN` = bot token from step 1
   - `TELEGRAM_CHAT_ID` = chat id from step 2
   - `TELEGRAM_WEBHOOK_SECRET` = secret from step 3
5. **Deploy** so the new env vars are live.
6. **Register the webhook** so Telegram knows where to deliver button presses:

   ```sh
   curl -F "url=https://pixle.art/api/telegram/webhook" \
        -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
        "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
   ```

   Expected response: `{"ok":true,"result":true,...}`. If it isn't `ok:true`,
   check that the URL is HTTPS, public, and resolves to a 2xx.

## Verifying it works

- Open the gallery, tap the small flag icon on any card.
- The Telegram chat should receive a message with the thumbnail, the item
  link, and `Delete` / `Dismiss` buttons.
- Tap `Delete` → message edits to `🗑 Deleted by @you`, the gallery item
  disappears (refresh the gallery to confirm).

## Troubleshooting

- **No alert arrives.** Check `vercel logs` for the report endpoint — most
  failures are missing env vars (`Telegram not configured`).
- **Button taps do nothing.** Re-run the `setWebhook` command. Telegram
  silently retries failed deliveries; check `getWebhookInfo` for the last
  error: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`.
- **`Delete` reports an error.** Make sure the deploy is on a recent commit
  that has `lib/db/queries.ts:deleteGeneration`. Blob deletion is best-effort
  — even if a blob 404s, the row gets removed.
