const BASE = 'https://api.meshy.ai/openapi/v2/image-to-3d';

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED';

export type MeshyTask = {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  model_urls?: { glb?: string; fbx?: string; usdz?: string };
  thumbnail_url?: string;
  task_error?: { message: string };
};

export function hasMeshyKey(): boolean {
  return Boolean(process.env.MESHY_API_KEY);
}

export async function meshyCreateTask(args: {
  imageDataUrl: string;
  artStyle: 'realistic' | 'sculpture';
  topology: 'triangle' | 'quad';
  targetPolycount: number;
  shouldRemesh: boolean;
}): Promise<{ taskId: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) throw new Error('MESHY_API_KEY missing');

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      image_url: args.imageDataUrl,
      ai_model: 'meshy-4',
      topology: args.topology,
      target_polycount: args.targetPolycount,
      should_remesh: args.shouldRemesh,
      symmetry_mode: 'auto',
      enable_pbr: true,
      surface_mode: args.artStyle === 'sculpture' ? 'organic' : 'hard'
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meshy create failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result: string };
  return { taskId: json.result };
}

export async function meshyGetTask(taskId: string): Promise<MeshyTask> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) throw new Error('MESHY_API_KEY missing');

  const res = await fetch(`${BASE}/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meshy fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as MeshyTask;
}
