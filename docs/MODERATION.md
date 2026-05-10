# Gallery moderation

Reports surface as email; deletion happens in the Vercel dashboard. No bots,
no admin tokens, no public delete endpoint.

## How it works

1. Visitor taps the small flag on a gallery card.
2. `POST /api/gallery/[id]/report` validates the item exists and sends an
   email via [Resend](https://resend.com/) to the moderation inbox.
3. Moderator reads the email (preview, link, ID), opens the Vercel dashboard,
   and removes the row manually.

## One-time setup

1. **Resend account.** Sign up at [resend.com](https://resend.com/), grab an
   API key from `API Keys`. Free tier covers ~100 emails/day, plenty for
   reports.
2. **Sender** (optional but recommended). Verify the `pixle.art` domain in
   Resend and use a sender like `reports@pixle.art`. Without verification
   email goes from `onboarding@resend.dev` and is more likely to land in
   spam.
3. **Vercel env vars** (`Settings → Environment Variables`):
   - `RESEND_API_KEY` — from step 1
   - `MODERATION_EMAIL` — inbox to receive reports (e.g. your gmail)
   - `MODERATION_FROM` — *(optional)* verified sender, default
     `Pixle Reports <onboarding@resend.dev>`
4. **Deploy** so the new env vars are live.

## Removing a reported item

When a report email arrives:

1. Open the Vercel project → **Storage** → click the Postgres store.
2. Switch to **Data** and the `generations` table.
3. Filter by `id = '<id from email>'`. Delete that row.
4. Optional cleanup: in the `likes` table, delete rows where
   `generation_id = '<id>'`.
5. The blob files (thumbnail + preview) are unreferenced after that. They
   stay in Vercel Blob until manually pruned in `Storage → Blob`.

## Spam protection

There's no rate limit on reports yet. If abuse becomes a problem, add a
per-`clientId` cooldown in `app/api/gallery/[id]/report/route.ts`.
