import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TouchProvider } from '@/components/TouchProvider';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'Pixel-to-3D Studio',
  description: 'Draw pixel art and turn it into animated 3D models'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-white antialiased min-h-screen">
        <TouchProvider>
          {children}
          <Toaster />
        </TouchProvider>
      </body>
    </html>
  );
}
