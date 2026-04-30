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
    <div className="relative w-full h-full bg-bg rounded-lg border border-border overflow-hidden">
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [3, 2.5, 3], fov: 45 }}
        shadows
      >
        <color attach="background" args={['#0a0a0b']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} castShadow />
        <Suspense fallback={null}>
          <Environment preset="studio" />
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

      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <Button size="icon" variant="secondary" onClick={() => setResetSignal((s) => s + 1)} aria-label="Reset camera">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={wireframe ? 'default' : 'secondary'}
          onClick={() => setWireframe((w) => !w)}
          aria-label="Toggle wireframe"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={!currentModel}
        >
          <Download className="h-4 w-4" />
          .glb
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={!currentModel || savedToGallery}
        >
          <Save className="h-4 w-4" />
          {savedToGallery ? 'Saved' : 'Save to gallery'}
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
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="bg-panel border border-border rounded-lg px-6 py-4 min-w-[240px] text-center">
        {status === 'error' ? (
          <>
            <div className="text-red-400 text-sm font-medium mb-1">Generation failed</div>
            <div className="text-xs text-muted">{error}</div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium mb-2 capitalize">{status}…</div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent2 transition-[width] duration-300"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <div className="text-xs text-muted mt-2">{Math.round(progress)}%</div>
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

  const cubes = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; color: THREE.Color; depth: number }> = [];
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const a = pixels[i + 3] ?? 0;
        if (a < 16) continue;
        const r = pixels[i] ?? 0;
        const g = pixels[i + 1] ?? 0;
        const b = pixels[i + 2] ?? 0;
        // Лёгкая Z-экструзия по яркости — даёт ощущение объёма из плоского рисунка.
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const depth = styleId === 'voxel' || styleId === 'lowpoly' ? 0.3 + lum * 0.6 : 1;
        out.push({
          pos: [x - half + 0.5, half - y - 0.5, 0],
          color: new THREE.Color(r / 255, g / 255, b / 255),
          depth
        });
      }
    }
    return out;
    // version форсирует пересчёт даже если pixels-ссылка та же.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixels, size, version, styleId]);

  useStyleAnimation(groupRef, styleId);

  const scale = 2 / size;
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
    <group ref={groupRef} scale={scale}>
      <Instances limit={4096} range={cubes.length} castShadow receiveShadow>
        {isClay ? (
          <sphereGeometry args={[0.55, 12, 12]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          wireframe={wireframe}
          transparent={isHolo}
          opacity={isHolo ? 0.65 : 1}
          emissive={isHolo ? new THREE.Color('#7dd3fc') : new THREE.Color('#000000')}
          emissiveIntensity={isHolo ? 0.5 : 0}
          roughness={isStone ? 0.95 : isClay ? 0.85 : isLowPoly ? 0.7 : 0.5}
          metalness={isStone ? 0.1 : 0}
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
