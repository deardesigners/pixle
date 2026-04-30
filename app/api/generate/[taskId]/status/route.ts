import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { meshyGetTask, hasMeshyKey } from '@/lib/meshy';
import { setGenerationModel } from '@/lib/db/queries';
import { db } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  ctx: { params: { taskId: string } }
): Promise<Response> {
  try {
    if (!hasMeshyKey()) {
      return NextResponse.json({ status: 'SUCCEEDED', progress: 100, modelUrl: 'demo://voxel' });
    }

    const taskId = ctx.params.taskId;
    const task = await meshyGetTask(taskId);

    if (task.status === 'SUCCEEDED' && task.model_urls?.glb) {
      const { rows } = await db<{ id: string; model_url: string }>`
        SELECT id, model_url FROM generations WHERE meshy_task_id = ${taskId} LIMIT 1
      `;
      const row = rows[0];
      if (row && !row.model_url) {
        // Однократно перекладываем .glb из Meshy в наш Blob.
        const fetched = await fetch(task.model_urls.glb);
        if (!fetched.ok) throw new Error(`Failed to fetch glb: ${fetched.status}`);
        const ab = await fetched.arrayBuffer();
        const blob = await put(`models/${row.id}.glb`, Buffer.from(ab), {
          access: 'public',
          contentType: 'model/gltf-binary'
        });
        await setGenerationModel(row.id, blob.url, 'ready');
        return NextResponse.json({
          status: task.status,
          progress: 100,
          modelUrl: blob.url,
          generationId: row.id
        });
      }
      if (row) {
        return NextResponse.json({
          status: task.status,
          progress: 100,
          modelUrl: row.model_url,
          generationId: row.id
        });
      }
    }

    if (task.status === 'FAILED' || task.status === 'CANCELED' || task.status === 'EXPIRED') {
      return NextResponse.json(
        { status: task.status, progress: task.progress, error: task.task_error?.message ?? 'Task failed' },
        { status: 200 }
      );
    }

    return NextResponse.json({ status: task.status, progress: task.progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[status]', message);
    return NextResponse.json({ code: 'STATUS_FAILED', message }, { status: 500 });
  }
}
