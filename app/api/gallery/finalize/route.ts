import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { FinalizeBodySchema } from '@/lib/validation';
import { setGenerationThumbnail } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.POSTGRES_URL) {
      return NextResponse.json(
        { code: 'DEMO_MODE', message: 'Gallery недоступна без BLOB_READ_WRITE_TOKEN и POSTGRES_URL' },
        { status: 503 }
      );
    }
    const body = await req.json();
    const parsed = FinalizeBodySchema.parse(body);

    const m = parsed.thumbnailBase64.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!m) return NextResponse.json({ code: 'BAD_THUMB', message: 'Invalid data URL' }, { status: 400 });
    const buffer = Buffer.from(m[2] ?? '', 'base64');

    const blob = await put(`thumbs/${parsed.generationId}.png`, buffer, {
      access: 'public',
      contentType: `image/${m[1] ?? 'png'}`
    });

    await setGenerationThumbnail(parsed.generationId, blob.url);
    return NextResponse.json({ thumbnailUrl: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[finalize]', message);
    return NextResponse.json({ code: 'FINALIZE_FAILED', message }, { status: 500 });
  }
}
