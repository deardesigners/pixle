import { Resend } from 'resend';

/**
 * Thin wrapper over Resend for the moderation flow.
 *
 * Required env vars (set in Vercel):
 *   RESEND_API_KEY     — from resend.com (free tier covers Pixle volumes)
 *   MODERATION_EMAIL   — inbox to receive report alerts
 *   MODERATION_FROM    — verified sender, e.g. "Pixle <reports@pixle.art>".
 *                        If not set, falls back to Resend's onboarding sender,
 *                        which works without domain verification but lands in
 *                        spam more often.
 */

const FALLBACK_FROM = 'Pixle Reports <onboarding@resend.dev>';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MODERATION_EMAIL);
}

export async function sendReportEmail(args: {
  itemId: string;
  styleId: string;
  thumbnailUrl: string | null;
  reporterClientId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.MODERATION_EMAIL;
  if (!apiKey || !to) throw new Error('Email moderation not configured');

  const resend = new Resend(apiKey);
  const url = `https://pixle.art/g/${args.itemId}`;
  const dashboard = 'https://vercel.com/dashboard/stores'; // moderator clicks here to delete the row
  const reporter = args.reporterClientId.slice(0, 8);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h1 style="font-size:18px;margin:0 0 16px;">🚩 Gallery report</h1>
      <p style="margin:0 0 16px;">A visitor flagged a work as inappropriate.</p>
      ${args.thumbnailUrl ? `<img src="${args.thumbnailUrl}" alt="" style="max-width:100%;border-radius:8px;border:1px solid #eee;margin:0 0 16px;" />` : ''}
      <table style="border-collapse:collapse;font-size:14px;line-height:1.6;">
        <tr><td style="color:#666;padding-right:12px;">ID</td><td><code>${args.itemId}</code></td></tr>
        <tr><td style="color:#666;padding-right:12px;">Style</td><td>${escapeHtml(args.styleId)}</td></tr>
        <tr><td style="color:#666;padding-right:12px;">Reporter</td><td><code>${escapeHtml(reporter)}…</code></td></tr>
        <tr><td style="color:#666;padding-right:12px;">View</td><td><a href="${url}">${url}</a></td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="margin:0;font-size:13px;color:#666;">
        To remove: open <a href="${dashboard}">Vercel Storage</a> → Postgres →
        <code>generations</code> table, filter by id <code>${args.itemId}</code>,
        delete the row. Likes referencing it can be removed from the
        <code>likes</code> table by <code>generation_id</code>.
      </p>
    </div>
  `.trim();

  const text =
    `Gallery report\n\n` +
    `ID: ${args.itemId}\n` +
    `Style: ${args.styleId}\n` +
    `Reporter: ${reporter}…\n` +
    `View: ${url}\n\n` +
    `To remove: Vercel dashboard → Storage → Postgres → generations, delete row by id.`;

  await resend.emails.send({
    from: process.env.MODERATION_FROM || FALLBACK_FROM,
    to,
    subject: `🚩 Pixle report · ${args.itemId}`,
    html,
    text
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
