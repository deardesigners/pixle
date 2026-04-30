import { NextResponse } from 'next/server';
import { GalleryQuerySchema } from '@/lib/validation';
import { listGenerations } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const parsed = GalleryQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));

    const myClientId = parsed.clientId ?? null;
    const filterClient = parsed.mine === '1' && myClientId ? myClientId : undefined;

    const result = await listGenerations({
      styleId: parsed.style,
      clientId: filterClient,
      myClientId: myClientId ?? undefined,
      sort: parsed.sort,
      cursor: parsed.cursor,
      limit: parsed.limit
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gallery]', message);
    return NextResponse.json({ code: 'GALLERY_FAILED', message }, { status: 500 });
  }
}
