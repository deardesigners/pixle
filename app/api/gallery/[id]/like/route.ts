import { NextResponse } from 'next/server';
import { LikeBodySchema } from '@/lib/validation';
import { toggleLike } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
): Promise<Response> {
  try {
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ liked: false, count: 0 });
    }
    const body = await req.json();
    const parsed = LikeBodySchema.parse(body);
    const result = await toggleLike(ctx.params.id, parsed.clientId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[like]', message);
    return NextResponse.json({ code: 'LIKE_FAILED', message }, { status: 500 });
  }
}
