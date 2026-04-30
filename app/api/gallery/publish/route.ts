import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { StyleIdSchema, PixelDataSchema } from '@/lib/validation';
import { createGeneration } from '@/lib/db/queries';

export const runtime = 'nodejs';

const PublishBodySchema = z.object({
  clientId: z.string().min(8),
  styleId: StyleIdSchema,
  pixelData: PixelDataSchema,
  previewBase64: z.string().min(64),
  thumbnailBase64: z.string().min(64)
});

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!m) throw new Error('Invalid data URL');
  return Buffer.from(m[2] ?? '', 'base64');
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.POSTGRES_URL) {
      return NextResponse.json(
        { code: 'STORAGE_NOT_CONFIGURED', message: 'Vercel Blob и Postgres не подключены' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = PublishBodySchema.parse(body);
    const id = nanoid(10);

    const previewBuf = dataUrlToBuffer(parsed.previewBase64);
    const thumbBuf = dataUrlToBuffer(parsed.thumbnailBase64);

    const [previewBlob, thumbBlob] = await Promise.all([
      put(`previews/${id}.png`, previewBuf, { access: 'public', contentType: 'image/png' }),
      put(`thumbs/${id}.png`, thumbBuf, { access: 'public', contentType: 'image/png' })
    ]);

    await createGeneration({
      id,
      clientId: parsed.clientId,
      styleId: parsed.styleId,
      pixelData: parsed.pixelData,
      previewUrl: previewBlob.url,
      thumbnailUrl: thumbBlob.url,
      status: 'ready'
    });

    return NextResponse.json({ id, previewUrl: previewBlob.url, thumbnailUrl: thumbBlob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[publish]', message);
    return NextResponse.json({ code: 'PUBLISH_FAILED', message }, { status: 500 });
  }
}
