import { db, type GenerationRow } from './client';
import type { StyleId } from '../validation';

export type ListSort = 'recent' | 'popular';

export type GenerationListItem = GenerationRow & { like_count: number; liked_by_me: boolean };

export async function createGeneration(args: {
  id: string;
  clientId: string;
  styleId: StyleId;
  pixelData: { size: number; pixels: number[][] };
  previewUrl: string;
  thumbnailUrl: string;
  status?: string;
}): Promise<void> {
  // model_url и meshy_task_id оставлены пустыми — наследие старой схемы.
  // Галерея рендерит 3D из pixel_data на лету, .glb-файлы не нужны.
  await db`
    INSERT INTO generations (id, client_id, style_id, pixel_data, preview_url, thumbnail_url, status)
    VALUES (
      ${args.id},
      ${args.clientId},
      ${args.styleId},
      ${JSON.stringify(args.pixelData)}::jsonb,
      ${args.previewUrl},
      ${args.thumbnailUrl},
      ${args.status ?? 'ready'}
    )
  `;
}

export async function getGeneration(id: string): Promise<GenerationRow | null> {
  const { rows } = await db<GenerationRow>`SELECT * FROM generations WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

/**
 * Delete a generation row + its likes. Caller is responsible for deleting
 * the associated Vercel Blob files (preview + thumbnail).
 */
export async function deleteGeneration(id: string): Promise<void> {
  await db`DELETE FROM likes WHERE generation_id = ${id}`;
  await db`DELETE FROM generations WHERE id = ${id}`;
}

/**
 * Динамический SELECT: разные фильтры (style/clientId), сортировка (recent/popular)
 * и курсорная пагинация — собираем параметризованный SQL вручную, не tagged template,
 * потому что @vercel/postgres `sql` не поддерживает вложенную композицию фрагментов.
 */
export async function listGenerations(args: {
  styleId?: StyleId;
  clientId?: string;
  myClientId?: string;
  sort: ListSort;
  cursor?: string;
  limit: number;
}): Promise<{ items: GenerationListItem[]; nextCursor: string | null }> {
  const { styleId, clientId, myClientId, sort, cursor, limit } = args;

  const params: unknown[] = [];
  const push = (v: unknown): string => {
    params.push(v);
    return `$${params.length}`;
  };

  const conds: string[] = ["g.status = 'ready'"];
  if (styleId) conds.push(`g.style_id = ${push(styleId)}`);
  if (clientId) conds.push(`g.client_id = ${push(clientId)}`);

  const myIdRef = push(myClientId ?? '');

  const cursorParts = cursor ? cursor.split('|') : null;

  if (sort === 'recent') {
    if (cursorParts && cursorParts.length === 2) {
      conds.push(
        `(g.created_at, g.id) < (${push(cursorParts[0]!)}::timestamptz, ${push(cursorParts[1]!)})`
      );
    }
    const limitRef = push(limit + 1);
    const text = `
      SELECT g.*,
        COALESCE((SELECT COUNT(*)::int FROM likes l WHERE l.generation_id = g.id), 0) AS like_count,
        EXISTS (SELECT 1 FROM likes l WHERE l.generation_id = g.id AND l.client_id = ${myIdRef}) AS liked_by_me
      FROM generations g
      WHERE ${conds.join(' AND ')}
      ORDER BY g.created_at DESC, g.id DESC
      LIMIT ${limitRef}
    `;
    const { rows } = await db.query<GenerationListItem>(text, params);
    const items = rows.slice(0, limit);
    const next =
      rows.length > limit && items.length > 0
        ? `${items[items.length - 1]!.created_at}|${items[items.length - 1]!.id}`
        : null;
    return { items, nextCursor: next };
  }

  // popular: фильтр и упорядочивание по like_count в обёртке.
  const outerConds: string[] = [];
  if (cursorParts && cursorParts.length === 3) {
    outerConds.push(
      `(like_count, created_at, id) < (${push(parseInt(cursorParts[0]!, 10))}, ${push(cursorParts[1]!)}::timestamptz, ${push(cursorParts[2]!)})`
    );
  }
  const limitRef = push(limit + 1);
  const text = `
    WITH base AS (
      SELECT g.*,
        COALESCE((SELECT COUNT(*)::int FROM likes l WHERE l.generation_id = g.id), 0) AS like_count,
        EXISTS (SELECT 1 FROM likes l WHERE l.generation_id = g.id AND l.client_id = ${myIdRef}) AS liked_by_me
      FROM generations g
      WHERE ${conds.join(' AND ')}
    )
    SELECT * FROM base
    ${outerConds.length > 0 ? `WHERE ${outerConds.join(' AND ')}` : ''}
    ORDER BY like_count DESC, created_at DESC, id DESC
    LIMIT ${limitRef}
  `;
  const { rows } = await db.query<GenerationListItem>(text, params);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit && items.length > 0
      ? `${items[items.length - 1]!.like_count}|${items[items.length - 1]!.created_at}|${items[items.length - 1]!.id}`
      : null;
  return { items, nextCursor: next };
}

export async function toggleLike(
  generationId: string,
  clientId: string
): Promise<{ liked: boolean; count: number }> {
  const { rows: existing } = await db`
    SELECT 1 FROM likes WHERE generation_id = ${generationId} AND client_id = ${clientId} LIMIT 1
  `;
  if (existing.length > 0) {
    await db`DELETE FROM likes WHERE generation_id = ${generationId} AND client_id = ${clientId}`;
  } else {
    await db`INSERT INTO likes (generation_id, client_id) VALUES (${generationId}, ${clientId})`;
  }
  const { rows: count } = await db<{ c: number }>`
    SELECT COUNT(*)::int AS c FROM likes WHERE generation_id = ${generationId}
  `;
  return { liked: existing.length === 0, count: count[0]?.c ?? 0 };
}

export async function getLikeStats(
  generationId: string,
  clientId: string | null
): Promise<{ count: number; liked: boolean }> {
  const { rows: count } = await db<{ c: number }>`
    SELECT COUNT(*)::int AS c FROM likes WHERE generation_id = ${generationId}
  `;
  let liked = false;
  if (clientId) {
    const { rows } = await db`
      SELECT 1 FROM likes WHERE generation_id = ${generationId} AND client_id = ${clientId} LIMIT 1
    `;
    liked = rows.length > 0;
  }
  return { count: count[0]?.c ?? 0, liked };
}
