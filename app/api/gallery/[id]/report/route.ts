import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeneration } from '@/lib/db/queries';
import { isEmailConfigured, sendReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

const ReportBodySchema = z.object({
  clientId: z.string().min(8)
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params): Promise<Response> {
  try {
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ code: 'STORAGE_NOT_CONFIGURED' }, { status: 503 });
    }
    if (!isEmailConfigured()) {
      return NextResponse.json({ code: 'MODERATION_NOT_CONFIGURED' }, { status: 503 });
    }

    const body = await req.json();
    const parsed = ReportBodySchema.parse(body);
    const item = await getGeneration(params.id);
    if (!item) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

    await sendReportEmail({
      itemId: item.id,
      styleId: item.style_id,
      thumbnailUrl: item.thumbnail_url || item.preview_url || null,
      reporterClientId: parsed.clientId
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[report]', message);
    return NextResponse.json({ code: 'REPORT_FAILED', message }, { status: 500 });
  }
}
