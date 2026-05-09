import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getGeneration } from '@/lib/db/queries';
import { STYLE_PRESETS } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { GalleryHorizontal, Recycle } from 'lucide-react';
import { ModelPreview } from '@/components/gallery/ModelPreview';
import { LogoMark } from '@/components/LogoMark';

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
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Studio-parity header: rotating 3D logo + work label, primary CTA back to gallery (with glow). */}
      <header className="px-6 pt-4 pb-3 flex items-center gap-3">
        <Link href="/" aria-label="Pixle home" className="flex items-center gap-3">
          <LogoMark sizeClass="h-16 w-16" />
          <span className="cs-label hidden sm:inline">
            {styleLabel} · {size}×{size}
          </span>
        </Link>
        <Link href="/gallery" className="ml-auto">
          <Button variant="default" aria-label="Back to gallery" className="cs-glow">
            <GalleryHorizontal className="h-[18px] w-[18px]" />
            Gallery
          </Button>
        </Link>
      </header>

      <h1 className="sr-only">{styleLabel} pixel art in 3D</h1>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full grid gap-6 md:grid-cols-2">
        <section className="relative cs-card aspect-square overflow-hidden">
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
          <h2 className="font-display font-bold text-[24px] tracking-tightest leading-none text-accent-bold">
            {styleLabel} pixel art
          </h2>
          <p className="text-muted leading-relaxed">
            A {size}×{size} pixel art sprite rendered as a 3D model in the {styleLabel} style
            {styleDescription ? ` — ${styleDescription.toLowerCase()}` : ''}. Created with Pixle, a
            free online pixel art editor that turns your drawings into animated 3D models.
          </p>

          <h3 className="font-display text-lg tracking-tightest mt-2">About this style</h3>
          <p className="text-muted leading-relaxed">
            {styleLabel} is one of the render styles available in Pixle. Draw any pixel art
            and instantly see it extruded as a 3D model — no modeling software, no setup. Pick
            from Voxel, Neon, Mercury, and DHL to give your sprite a different material and feel.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Link href={`/?remix=${item.id}`}>
              <Button variant="default" aria-label="Remix this work in the editor">
                <Recycle className="h-[18px] w-[18px]" />
                Remix in editor
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="ghost" aria-label="Browse gallery">
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
