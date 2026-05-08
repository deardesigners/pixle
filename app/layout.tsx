import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TouchProvider } from '@/components/TouchProvider';
import { Toaster } from '@/components/Toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const SITE_URL = 'https://pixle.art';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Pixle • Pixel art into 3D',
    template: '%s · Pixle'
  },
  description:
    'Draw pixel art in your browser and turn it into animated 3D models. Free online pixel art editor with instant 3D extrusion, multiple styles, and shareable gallery.',
  keywords: [
    'pixel art',
    'pixel art to 3d',
    'pixel art 3d generator',
    'pixel art editor',
    'pixel art online',
    'sprite to 3d',
    '3d pixel art',
    'voxel art',
    'pixel art maker'
  ],
  applicationName: 'Pixle',
  authors: [{ name: 'Pixle' }],
  creator: 'Pixle',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Pixle',
    title: 'Pixle • Pixel art into 3D',
    description:
      'Draw pixel art and turn it into animated 3D models. Free, online, no install.',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixle • Pixel art into 3D',
    description:
      'Draw pixel art and turn it into animated 3D models. Free, online, no install.'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  category: 'design'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Pixle',
  url: SITE_URL,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description:
    'Online pixel art editor that turns your drawings into animated 3D models in the browser.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  browserRequirements: 'Requires modern browser with WebGL'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg text-text antialiased min-h-screen font-sans">
        <TouchProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
          <Toaster />
        </TouchProvider>
      </body>
    </html>
  );
}
