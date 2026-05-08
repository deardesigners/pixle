import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pixle • Pixel art into 3D';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(circle at 20% 20%, #2a1f3d 0%, #0f0a1a 60%, #050308 100%)',
          color: '#fff',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.7 }}>
          <div
            style={{
              width: 14,
              height: 14,
              background: '#a855f7',
              boxShadow: '20px 0 0 #f0abfc, 0 20px 0 #c084fc, 20px 20px 0 #fff'
            }}
          />
          <div style={{ fontSize: 22, letterSpacing: 2, textTransform: 'uppercase' }}>
            pixle.art
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 128,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
              gap: 24
            }}
          >
            <span>Pixel</span>
            <span style={{ opacity: 0.4, fontSize: 96 }}>→</span>
            <span
              style={{
                background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              3D
            </span>
          </div>
          <div style={{ fontSize: 36, opacity: 0.75, maxWidth: 900, lineHeight: 1.2 }}>
            Draw pixel art. Turn it into animated 3D models. Free, online, in your browser.
          </div>
        </div>
      </div>
    ),
    size
  );
}
