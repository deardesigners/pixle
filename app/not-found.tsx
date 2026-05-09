import Link from 'next/link';
import { ArrowLeft, GalleryHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="font-display font-bold text-[64px] tracking-tightest leading-none text-accent-bold">
        404
      </span>
      <h1 className="mt-4 font-display font-semibold text-[20px] tracking-tightest leading-tight">
        This page doesn't exist
      </h1>
      <p className="mt-2 max-w-sm text-[14px] text-muted leading-relaxed">
        The work you're looking for may have been removed, or the link is wrong.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="default" aria-label="Open studio" className="cs-glow">
            <ArrowLeft className="h-[18px] w-[18px]" />
            Studio
          </Button>
        </Link>
        <Link href="/gallery">
          <Button variant="ghost" aria-label="Browse gallery">
            <GalleryHorizontal className="h-[18px] w-[18px]" />
            Browse gallery
          </Button>
        </Link>
      </div>
    </div>
  );
}
