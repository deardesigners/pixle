'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor, pixelsToFlat } from '@/lib/store';
import { STYLE_PRESETS } from '@/lib/styles';
import { Button } from '@/components/ui/button';
import { RefreshCw, Layers, Save } from 'lucide-react';
import { toast } from '@/components/Toaster';
import { cn } from '@/lib/utils';
import { pixelsToCubes } from '@/lib/pixelToCubes';
import { getClientId } from '@/lib/clientId';

export function ModelViewer() {
  const { pixels, size, currentStyle } = useEditor();
  const [wireframe, setWireframe] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);

  const isEmpty = useMemo(
    () => Array.from(pixels).every((v, i) => (i % 4 === 3 ? v === 0 : true)),
    [pixels]
  );

  const onPublish = async () => {
    if (isEmpty || publishing) return;
    setPublishing(true);
    try {
      const thumbnailBase64 = captureRef.current?.();
      if (!thumbnailBase64) {
        toast('Не удалось снять превью сцены');
        setPublishing(false);
        return;
      }
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 256;
      exportCanvas.height = 256;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unsupported');
      ctx.imageSmoothingEnabled = false;
      const pxSize = 256 / size;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const a = pixels[i + 3] ?? 0;
          if (a === 0) continue;
          ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${a / 255})`;
          ctx.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
        }
      }
      const previewBase64 = exportCanvas.toDataURL('image/png');

      const res = await fetch('/api/gallery/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          styleId: currentStyle,
          pixelData: { size, pixels: pixelsToFlat(pixels) },
          previewBase64,
          thumbnailBase64
        })
      });
      if (res.status === 503) {
        toast('Хранилище не подключено. Нужны Postgres + Blob.');
        return;
      }
      if (!res.ok) throw new Error('Publish failed');
      setPublished(true);
      toast('Опубликовано', { label: 'Открыть', onClick: () => window.open('/gallery', '_self') });
    } catch (err) {
      console.error(err);
      toast('Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="relative w-full h-full cs-card overflow-hidden">
      <Canvas
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          // NoToneMapping сохраняет цвета 1:1; ACESFilmic иначе бледнит насыщенные.
          toneMapping: THREE.NoToneMapping
        }}
        camera={{ position: [3, 2.5, 3], fov: 45 }}
        shadows
        flat
      >
        <color attach="background" args={['#F3F0FF']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 4]} intensity={0.35} castShadow />
        <Suspense fallback={null}>
          <Environment preset="apartment" environmentIntensity={0.05} background={false} />
          <LivePixelModel
            styleId={currentStyle}
            wireframe={wireframe}
            resetSignal={resetSignal}
            registerCapture={(fn) => (captureRef.current = fn)}
          />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.5} scale={6} blur={2.4} far={2} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={8} />
      </Canvas>

      <div className="absolute top-5 left-5 cs-label">Render</div>

      <div className="absolute top-4 right-4 flex flex-col gap-1.5">
        <button
          onClick={() => setResetSignal((s) => s + 1)}
          aria-label="Reset camera"
          className="h-9 w-9 inline-flex items-center justify-center rounded-full border-[1.5px] border-text/15 bg-white/70 backdrop-blur text-text hover:border-text hover:bg-text hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setWireframe((w) => !w)}
          aria-label="Toggle wireframe"
          className={cn(
            'h-9 w-9 inline-flex items-center justify-center rounded-full border-[1.5px] bg-white/70 backdrop-blur transition-colors',
            wireframe
              ? 'border-text bg-accent text-accent-bold'
              : 'border-text/15 text-text hover:border-text hover:bg-text hover:text-white'
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        <Button variant="default" onClick={onPublish} disabled={isEmpty || publishing || published}>
          {publishing ? (
            <>
              <span className="flex gap-1"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /></span>
              <span>Publishing</span>
            </>
          ) : (
            <>
              <Save className="h-[18px] w-[18px]" />
              {published ? 'Published' : 'Publish'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function LivePixelModel({
  styleId,
  wireframe,
  resetSignal,
  registerCapture
}: {
  styleId: keyof typeof STYLE_PRESETS;
  wireframe: boolean;
  resetSignal: number;
  registerCapture: (fn: () => string | null) => void;
}) {
  const { pixels, size, version } = useEditor();
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    registerCapture(() => {
      try { return gl.domElement.toDataURL('image/png'); } catch { return null; }
    });
  }, [gl, registerCapture]);

  useEffect(() => {
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal]);

  // version форсирует пересчёт даже при той же ссылке pixels (Uint8ClampedArray мутируется in-place).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { cubes, fit } = useMemo(() => pixelsToCubes(pixels, size), [pixels, size, version]);

  useStyleAnimation(groupRef, styleId);

  if (cubes.length === 0) {
    return (
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#E6EBF6" wireframe />
      </mesh>
    );
  }

  const isHolo = styleId === 'holographic';
  const isClay = styleId === 'claymation';
  const isLowPoly = styleId === 'lowpoly';

  return (
    <group ref={groupRef}>
      <group scale={fit.scale} position={[-fit.cx * fit.scale, -fit.cy * fit.scale, -fit.cz * fit.scale]}>
        <Instances limit={4096} range={cubes.length} castShadow receiveShadow>
          {isClay ? (
            <sphereGeometry args={[0.55, 12, 12]} />
          ) : (
            <boxGeometry args={[0.95, 0.95, 0.95]} />
          )}
          <meshStandardMaterial
            wireframe={wireframe}
            transparent={isHolo}
            opacity={isHolo ? 0.7 : 1}
            emissive={isHolo ? new THREE.Color('#7dd3fc') : new THREE.Color('#000000')}
            emissiveIntensity={isHolo ? 0.4 : 0}
            roughness={isHolo ? 0.6 : 0.95}
            metalness={0}
            flatShading={isLowPoly}
          />
          {cubes.map((c, i) => (
            <Instance key={i} position={c.pos} color={c.color} />
          ))}
        </Instances>
      </group>
    </group>
  );
}

function useStyleAnimation(ref: React.RefObject<THREE.Group>, styleId: keyof typeof STYLE_PRESETS) {
  const t0 = useRef(0);
  const flickerRef = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    t0.current += dt;
    const t = t0.current;
    const preset = STYLE_PRESETS[styleId];
    switch (preset.idleAnimation) {
      case 'float':
        g.position.y = Math.sin(t * 1.4) * 0.08;
        g.rotation.y += dt * 0.2;
        break;
      case 'rotate':
        g.rotation.y += dt * 0.5;
        break;
      case 'pulse': {
        const s = 1 + Math.sin(t * 2.5) * 0.02;
        g.scale.set(s, s, s);
        break;
      }
      case 'tiltSpin':
        g.rotation.y += dt * 0.4;
        g.rotation.z = Math.sin(t * 1.6) * 0.087;
        break;
      case 'flicker':
        g.rotation.y += dt * 0.25;
        flickerRef.current += dt;
        if (flickerRef.current > 0.1) {
          g.traverse((o) => {
            if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
              o.material.emissiveIntensity = 0.2 + Math.random() * 0.5;
            }
          });
          flickerRef.current = 0;
        }
        break;
      case 'static':
        g.rotation.y += dt * 0.05;
        break;
    }
  });
}
