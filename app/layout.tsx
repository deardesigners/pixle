import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TouchProvider } from '@/components/TouchProvider';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'Pixle — pixel art into 3D',
  description: 'Draw pixel art and watch it pop into animated 3D in six contrasting styles.'
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text antialiased min-h-screen font-sans">
        <TouchProvider>
          {children}
          <Toaster />
        </TouchProvider>
      </body>
    </html>
  );
}
