import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getGeneration } from '@/lib/db/queries';
import { STYLE_PRESETS } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Recycle } from 'lucide-react';
import { ModelPreview } from '@/components/gallery/ModelPreview';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

async function loadItem(id: string) {
  if (!process.env.POSTGRES_URL) return null;
  return getGeneration(id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const item = await loadItem(params.id);
  if (!item) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }
  const preset = STYLE_PRESETS[item.style_id as StyleId];
  const styleLabel = preset?.label ?? 'Pixel art';
  const title = `${styleLabel} pixel art in 3D`;
  const description = `${styleLabel} pixel art rendered as a 3D model in Pixle. Browse, remix, and turn your own pixel art into animated 3D models — free, online, in your browser.`;
  const ogImage = item.thumbnail_url || item.preview_url;
  return {
    title,
    description,
    alternates: { canonical: `/g/${item.id}` },
    openGraph: {
      title: `${title} · Pixle`,
      description,
      url: `https://pixle.art/g/${item.id}`,
      type: 'article',
      images: ogImage ? [{ url: ogImage, width: 1024, height: 1024 }] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Pixle`,
      description,
      images: ogImage ? [ogImage] : undefined
    }
  };
}

export default async function WorkPage({ params }: Params) {
  const item = await loadItem(params.id);
  if (!item) notFound();

  const preset = STYLE_PRESETS[item.style_id as StyleId];
  const styleLabel = preset?.label ?? 'Pixel art';
  const styleDescription = preset?.description ?? '';
  const thumb = item.thumbnail_url || item.preview_url;
  const size = item.pixel_data?.size ?? 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `${styleLabel} pixel art in 3D`,
    url: `https://pixle.art/g/${item.id}`,
    image: thumb || undefined,
    creator: { '@type': 'Person', name: 'Pixle community' },
    dateCreated: item.created_at,
    keywords: ['pixel art', '3d pixel art', 'voxel art', styleLabel.toLowerCase()],
    isBasedOn: 'https://pixle.art'
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
        <div className="px-6 h-14 flex items-center gap-4">
          <Link href="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Gallery
            </Button>
          </Link>
          <div className="flex items-baseline gap-2 flex-1">
            <h1 className="font-display font-semibold text-[15px] tracking-tightest leading-none">
              {styleLabel} pixel art in 3D
            </h1>
            <span className="label">Work · {size}×{size}</span>
          </div>
          <Link href={`/?remix=${item.id}`}>
            <Button variant="default" size="sm">
              <Recycle className="h-3.5 w-3.5" />
              Remix
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
        <section className="aspect-square bg-panel rounded-xl border border-border overflow-hidden relative">
          {item.pixel_data?.pixels?.length ? (
            <ModelPreview
              pixelData={item.pixel_data}
              styleId={(STYLE_PRESETS[item.style_id as StyleId] ? item.style_id : 'voxel') as StyleId}
            />
          ) : thumb ? (
            <Image src={thumb} alt={`${styleLabel} pixel art`} fill className="object-contain" unoptimized />
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl tracking-tightest">{styleLabel} pixel art</h2>
          <p className="text-muted leading-relaxed">
            A {size}×{size} pixel art sprite rendered as a 3D model in the {styleLabel} style
            {styleDescription ? ` — ${styleDescription.toLowerCase()}` : ''}. Created with Pixle, a
            free online pixel art editor that turns your drawings into animated 3D models.
          </p>

          <h3 className="font-display text-lg tracking-tightest mt-2">About this style</h3>
          <p className="text-muted leading-relaxed">
            {styleLabel} is one of three render styles available in Pixle. Draw any pixel art
            and instantly see it extruded as a 3D model — no modeling software, no setup. Pick
            from Voxel, Neon, and Mercury to give your sprite a different material and feel.
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Link href={`/?remix=${item.id}`}>
              <Button variant="default" size="sm">
                <Recycle className="h-4 w-4" />
                Remix this in the editor
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="secondary" size="sm">
                Browse gallery
              </Button>
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-sm text-muted leading-relaxed">
            <p>
              <Link href="/" className="underline hover:text-text">
                Make your own pixel art in 3D
              </Link>{' '}
              with Pixle — free, online, no install.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
