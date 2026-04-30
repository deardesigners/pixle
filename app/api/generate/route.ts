import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { GenerateBodySchema } from '@/lib/validation';
import { hasMeshyKey, meshyCreateTask } from '@/lib/meshy';
import { STYLE_PRESETS } from '@/lib/styles';
import { createGeneration } from '@/lib/db/queries';

export const runtime = 'nodejs';

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Invalid data URL');
  return { mime: m[1] ?? 'image/png', buffer: Buffer.from(m[2] ?? '', 'base64') };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const parsed = GenerateBodySchema.parse(body);

    const id = nanoid(10);
    const { buffer } = dataUrlToBuffer(parsed.imageBase64);

    const previewBlob = await put(`previews/${id}.png`, buffer, {
      access: 'public',
      contentType: 'image/png'
    });

    const preset = STYLE_PRESETS[parsed.styleId];

    let taskId: string | null = null;
    let modelUrl = '';
    let status = 'pending';

    if (hasMeshyKey()) {
      const result = await meshyCreateTask({
        imageDataUrl: parsed.imageBase64,
        artStyle: preset.meshyArtStyle,
        topology: preset.meshyTopology,
        targetPolycount: preset.meshyTargetPolycount,
        shouldRemesh: true
      });
      taskId = result.taskId;
    } else {
      // Demo-режим: воксельный фолбэк, рендер на клиенте.
      status = 'ready';
      modelUrl = 'demo://voxel';
    }

    await createGeneration({
      id,
      clientId: parsed.clientId,
      styleId: parsed.styleId,
      pixelData: parsed.pixelData,
      previewUrl: previewBlob.url,
      meshyTaskId: taskId,
      modelUrl,
      status
    });

    return NextResponse.json({
      generationId: id,
      taskId,
      previewUrl: previewBlob.url,
      modelUrl: modelUrl || null,
      demoMode: !hasMeshyKey()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate]', message);
    return NextResponse.json({ code: 'GENERATE_FAILED', message }, { status: 500 });
  }
}
