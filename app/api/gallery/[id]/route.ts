import { NextResponse } from 'next/server';
import { getGeneration, getLikeStats } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  ctx: { params: { id: string } }
): Promise<Response> {
  try {
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }
    const url = new URL(req.url);
    const clientId = url.searchParams.get('clientId');
    const row = await getGeneration(ctx.params.id);
    if (!row) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const likes = await getLikeStats(row.id, clientId);
    return NextResponse.json({ ...row, like_count: likes.count, liked_by_me: likes.liked });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generation]', message);
    return NextResponse.json({ code: 'FETCH_FAILED', message }, { status: 500 });
  }
}
