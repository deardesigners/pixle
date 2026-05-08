import type { MetadataRoute } from 'next';
import { db } from '@/lib/db/client';

const SITE_URL = 'https://pixle.art';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

async function listPublicWorks(): Promise<{ id: string; created_at: string }[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { rows } = await db<{ id: string; created_at: string }>`
      SELECT id, created_at FROM generations
      WHERE status = 'ready'
      ORDER BY created_at DESC
      LIMIT 5000
    `;
    return rows;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const works = await listPublicWorks();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'daily', priority: 0.8 }
  ];

  const workEntries: MetadataRoute.Sitemap = works.map((w) => ({
    url: `${SITE_URL}/g/${w.id}`,
    lastModified: new Date(w.created_at),
    changeFrequency: 'monthly',
    priority: 0.5
  }));

  return [...staticEntries, ...workEntries];
}
