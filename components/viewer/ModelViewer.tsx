'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '@/lib/store';
import { STYLE_PRESETS } from '@/lib/styles';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Layers, Save } from 'lucide-react';
import { toast } from '@/components/Toaster';
import { cn } from '@/lib/utils';

type Props = {
  onScreenshot?: (dataUrl: string) => void;
};

export function ModelViewer({ onScreenshot }: Props) {
  const { currentModel, currentStyle, generationStatus, generationProgress, generationError } = useEditor();
  const [wireframe, setWireframe] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);

  useEffect(() => {
    setSavedToGallery(false);
  }, [currentModel?.generationId]);

  const handleDownload = () => {
    if (!currentModel) return;
    if (currentModel.url.startsWith('demo://')) {
      toast('Demo mode: модель не сохраняется. Добавь MESHY_API_KEY.');
      return;
    }
    const a = document.createElement('a');
    a.href = currentModel.url;
    a.download = `${currentModel.generationId}.glb`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSave = async () => {
    if (!currentModel) return;
    const dataUrl = captureRef.current?.();
    if (!dataUrl) {
      toast('Не удалось снять превью сцены');
      return;
    }
    try {
      const res = await fetch('/api/gallery/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: currentModel.generationId, thumbnailBase64: dataUrl })
      });
      if (res.status === 503) {
        toast('Demo mode: галерея отключена. Подключи BLOB_READ_WRITE_TOKEN + POSTGRES_URL.');
        return;
      }
      if (!res.ok) throw new Error('Finalize failed');
      setSavedToGallery(true);
      toast('Saved to gallery', { label: 'Open', onClick: () => window.open('/gallery', '_self') });
      onScreenshot?.(dataUrl);
    } catch (err) {
      console.error(err);
      toast('Не удалось сохранить в галерею');
    }
  };

  return (
    <div className="relative w-full h-full cs-card overflow-hidden">
      <Canvas
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          // NoToneMapping сохраняет цвета 1:1 с пикселями — без него ACESFilmic
          // тонемэппинг в R3F бледнит насыщенные цвета.
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
          {/* Environment даёт лёгкий fill-light без отбеливания насыщенных цветов */}
          <Environment preset="apartment" environmentIntensity={0.05} background={false} />
          {currentModel && !currentModel.url.startsWith('demo://') ? (
            <ModelLoader
              url={currentModel.url}
              styleId={currentStyle}
              wireframe={wireframe}
              resetSignal={resetSignal}
              registerCapture={(fn) => (captureRef.current = fn)}
            />
          ) : (
            <LivePixelModel
              styleId={currentStyle}
              wireframe={wireframe}
              resetSignal={resetSignal}
              registerCapture={(fn) => (captureRef.current = fn)}
            />
          )}
          <ContactShadows
            position={[0, -1.05, 0]}
            opacity={0.5}
            scale={6}
            blur={2.4}
            far={2}
          />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={8} />
      </Canvas>

      <ProgressOverlay
        status={generationStatus}
        progress={generationProgress}
        error={generationError}
      />

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
            wireframe ? 'border-text bg-accent text-accent-bold' : 'border-text/15 text-text hover:border-text hover:bg-text hover:text-white'
          )}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!currentModel}>
          <Download className="h-3.5 w-3.5" />
          .glb
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={!currentModel || savedToGallery}>
          <Save className="h-3.5 w-3.5" />
          {savedToGallery ? 'Published' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}

function ProgressOverlay({
  status,
  progress,
  error
}: {
  status: string;
  progress: number;
  error: string | null;
}) {
  if (status === 'idle' || status === 'ready') return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/60 backdrop-blur-sm pointer-events-none fade-up">
      <div className="bg-panel border border-border rounded-2xl px-6 py-5 min-w-[260px] text-center">
        {status === 'error' ? (
          <>
            <div className="label text-red-400 mb-2">Generation failed</div>
            <div className="text-[13px] text-muted">{error}</div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1 mb-3">
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span className="ai-dot" />
            </div>
            <div className="font-display text-sm mb-3 lowercase tracking-tight">{status}</div>
            <div className="h-px bg-border-strong overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <div className="mono text-[10px] text-muted mt-2">{String(Math.round(progress)).padStart(2, '0')}%</div>
          </>
        )}
      </div>
    </div>
  );
}

function ModelLoader({
  url,
  styleId,
  wireframe,
  resetSignal,
  registerCapture
}: {
  url: string;
  styleId: keyof typeof STYLE_PRESETS;
  wireframe: boolean;
  resetSignal: number;
  registerCapture: (fn: () => string | null) => void;
}) {
  const { gl, camera } = useThree();

  useEffect(() => {
    registerCapture(() => {
      try {
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });
  }, [gl, registerCapture]);

  useEffect(() => {
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal]);

  return <RealModel url={url} styleId={styleId} wireframe={wireframe} />;
}

function RealModel({
  url,
  styleId,
  wireframe
}: {
  url: string;
  styleId: keyof typeof STYLE_PRESETS;
  wireframe: boolean;
}) {
  const gltf = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.wireframe = wireframe;
          if (styleId === 'holographic') {
            obj.material.transparent = true;
            obj.material.opacity = 0.6;
            obj.material.emissive = new THREE.Color('#7dd3fc');
            obj.material.emissiveIntensity = 0.4;
          }
        }
      }
    });
  }, [gltf, wireframe, styleId]);

  useStyleAnimation(groupRef, styleId);

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} scale={1.5} />
    </group>
  );
}

/**
 * Real-time 3D-превью пиксельного канваса. Перестраивается на каждый штрих
 * через зависимость от `version` (Uint8ClampedArray мутируется in-place).
 * InstancedMesh выдерживает до ~4096 кубов (64×64) без падения FPS.
 */
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
      try {
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });
  }, [gl, registerCapture]);

  useEffect(() => {
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal]);

  const { cubes, fit } = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; color: THREE.Color; depth: number }> = [];
    const half = size / 2;
    // Каждый уникальный цвет → свой Z-слой. Глубина модели растёт с числом цветов,
    // под камерой ¾ это даёт эффект стопки разноцветных пластин.
    const colorLayer = new Map<string, number>();
    let layerCount = 0;
    const layerSpacing = 1.0;
    const layerDepth = 0.95; // лёгкий зазор между слоями, чтобы они читались как plates

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const a = pixels[i + 3] ?? 0;
        if (a < 16) continue;
        const r = pixels[i] ?? 0;
        const g = pixels[i + 1] ?? 0;
        const b = pixels[i + 2] ?? 0;
        const key = `${r},${g},${b}`;
        let layer = colorLayer.get(key);
        if (layer === undefined) {
          layer = layerCount++;
          colorLayer.set(key, layer);
        }
        const px = x - half + 0.5;
        const py = half - y - 0.5;
        const pz = layer * layerSpacing;
        // Используем hex-строку: Three.js парсит как sRGB и корректно конвертит
        // в linear-пространство сцены. setRGB(r,g,b) с float-аргументами трактует
        // их как linear → итоговые цвета бледнеют после sRGB-вывода.
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        out.push({
          pos: [px, py, pz],
          color: new THREE.Color(hex),
          depth: layerDepth
        });
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
      }
    }
    if (out.length === 0) {
      return { cubes: out, fit: { cx: 0, cy: 0, cz: 0, scale: 1 } };
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    // Учитываем все три измерения — много цветов = глубокая модель.
    const longest = Math.max(maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1);
    const scale = 1.7 / longest;
    return { cubes: out, fit: { cx, cy, cz, scale } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixels, size, version, styleId]);

  useStyleAnimation(groupRef, styleId);

  const isHolo = styleId === 'holographic';
  const isClay = styleId === 'claymation';
  const isStone = styleId === 'stone';
  const isLowPoly = styleId === 'lowpoly';

  if (cubes.length === 0) {
    return (
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#26262a" wireframe />
      </mesh>
    );
  }

  return (
    // Внешняя группа крутится/пульсирует по стилю; внутренняя — масштаб
    // и центровка под bounding box, чтобы анимация не ломала auto-fit.
    <group ref={groupRef}>
      <group scale={fit.scale} position={[-fit.cx * fit.scale, -fit.cy * fit.scale, -fit.cz * fit.scale]}>
        <Instances limit={4096} range={cubes.length} castShadow receiveShadow>
          {isClay ? (
            <sphereGeometry args={[0.55, 12, 12]} />
          ) : (
            <boxGeometry args={[1, 1, 1]} />
          )}
          <meshStandardMaterial
            wireframe={wireframe}
            transparent={isHolo}
            opacity={isHolo ? 0.7 : 1}
            emissive={isHolo ? new THREE.Color('#7dd3fc') : new THREE.Color('#000000')}
            emissiveIntensity={isHolo ? 0.4 : 0}
            // Высокая roughness + 0 metalness = чистый Lambert-look без specular,
            // цвета сохраняют насыщенность под любым окружением.
            roughness={isHolo ? 0.6 : 0.95}
            metalness={0}
            flatShading={isLowPoly}
          />
          {cubes.map((c, i) => (
            <Instance
              key={i}
              position={c.pos}
              color={c.color}
              scale={[1, 1, c.depth]}
            />
          ))}
        </Instances>
      </group>
    </group>
  );
}

function PlaceholderCube() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#26262a" wireframe />
    </mesh>
  );
}

function useStyleAnimation(
  ref: React.RefObject<THREE.Group>,
  styleId: keyof typeof STYLE_PRESETS
) {
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
