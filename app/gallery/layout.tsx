import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery — Pixel Art in 3D',
  description:
    'A public gallery of pixel art turned into 3D models. Browse, filter by style, and remix community sprites in the Pixle pixel art editor.',
  alternates: { canonical: '/gallery' },
  openGraph: {
    title: 'Gallery — Pixel Art in 3D · Pixle',
    description: 'Browse pixel art rendered as 3D models. Filter, sort, remix.',
    url: 'https://pixle.art/gallery'
  }
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
