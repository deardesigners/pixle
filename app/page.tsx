import { Studio } from '@/components/Studio';

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Pixle • Pixel art into 3D</h1>
      <p className="sr-only">
        Pixle is a free online pixel art editor that turns your drawings into animated 3D
        models in the browser. Sketch sprites at 16, 32, or 64 pixel resolution, pick a render
        style — Voxel, Plush, Crystal, Neon, or Mercury — and instantly see the
        result extruded into 3D. Publish to a public gallery, browse community pixel art in
        3D, and remix any sprite as a starting point. No install, no account required.
      </p>
      <Studio />
    </>
  );
}
