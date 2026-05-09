'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { useEditor, pixelsToFlat } from '@/lib/store';
import { STYLE_PRESETS, STYLE_RENDER } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { RefreshCw, Layers, Save, FileVideo } from 'lucide-react';
import { toast } from '@/components/Toaster';
import { cn } from '@/lib/utils';
import { pixelsToCubes } from '@/lib/pixelToCubes';
import { getClientId } from '@/lib/clientId';
import { exportGif, downloadBlob } from '@/lib/gifExport';
import { StyledInstances } from './StyledInstances';
import { StyleSelector } from './StyleSelector';

export function ModelViewer() {
  const { pixels, size, version, currentStyle } = useEditor();
  const [wireframe, setWireframe] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [exportingGif, setExportingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const captureRef = useRef<(() => string | null) | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  // pixels — Uint8ClampedArray, мутируется in-place; ссылка не меняется.
  // version форсирует пересчёт когда buffer меняют (paint, undo, import,
  // remix). Без неё isEmpty залипал на initial true и Publish/GIF
  // оставались disabled навсегда.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isEmpty = useMemo(
    () => Array.from(pixels).every((v, i) => (i % 4 === 3 ? v === 0 : true)),
    [pixels, version]
  );

  const render = STYLE_RENDER[currentStyle];
  const isDark = currentStyle === 'neon' || currentStyle === 'mercury';

  const onExportGif = async () => {
    if (isEmpty || exportingGif) return;
    const canvas = canvasElRef.current;
    if (!canvas) {
      toast('Scene is still warming up. Try again in a moment.');
      return;
    }
    // Size from current preview (CSS pixels). The camera and viewing angle
    // already live in OrbitControls, sample frames use the same camera — so
    // the GIF captures exactly what the user sees. Cap at 640 on the long
    // edge; otherwise files balloon to tens of megabytes on big screens
    // and encoding becomes painfully slow.
    const cw = Math.max(1, Math.round(canvas.clientWidth));
    const ch = Math.max(1, Math.round(canvas.clientHeight));
    const MAX_SIDE = 640;
    const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch));
    const width = Math.max(64, Math.round(cw * scale));
    const height = Math.max(64, Math.round(ch * scale));

    setExportingGif(true);
    setGifProgress(0);
    try {
      const blob = await exportGif({
        canvas,
        width,
        height,
        fps: 24,
        durationSec: 4.0,
        background: render.background,
        onProgress: setGifProgress
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `pixle-${currentStyle}-${stamp}.gif`);
    } catch (err) {
      console.error(err);
      toast("Couldn't export the GIF. Try again.", {
        label: 'Retry',
        onClick: onExportGif
      });
    } finally {
      setExportingGif(false);
      setGifProgress(0);
    }
  };

  const onPublish = async () => {
    if (isEmpty || publishing) return;
    setPublishing(true);
    try {
      const thumbnailBase64 = captureRef.current?.();
      if (!thumbnailBase64) {
        toast('Scene is still warming up. Try again in a moment.');
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
        toast('Publishing is temporarily unavailable. Try again later.');
        return;
      }
      if (!res.ok) throw new Error('Publish failed');
      const data = (await res.json().catch(() => null)) as { id?: string } | null;
      const shareUrl = data?.id ? `${window.location.origin}/g/${data.id}` : null;
      if (shareUrl) {
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          /* clipboard may be blocked; fall through to the toast action */
        }
      }
      setPublished(true);
      toast(shareUrl ? 'Published · link copied' : 'Published', {
        label: 'Open',
        onClick: () => window.open(shareUrl ?? '/gallery', '_blank', 'noopener,noreferrer')
      });
    } catch (err) {
      console.error(err);
      toast("Couldn't publish. Check your connection and try again.", {
        label: 'Retry',
        onClick: onPublish
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="relative w-full h-full cs-card overflow-hidden">
      <Canvas
        gl={{
          preserveDrawingBuffer: true,
          antialias: true
        }}
        camera={{ position: [3, 2.5, 3], fov: 45 }}
        shadows
      >
        <color attach="background" args={[render.background]} />
        <ambientLight intensity={render.ambient} />
        {render.directional > 0 && (
          <directionalLight position={[4, 6, 4]} intensity={render.directional} castShadow />
        )}
        <Suspense fallback={null}>
          <Environment preset={render.envPreset} environmentIntensity={render.envIntensity} background={false} />
          <LivePixelModel
            styleId={currentStyle}
            wireframe={wireframe}
            resetSignal={resetSignal}
            registerCapture={(fn) => (captureRef.current = fn)}
            registerCanvas={(el) => (canvasElRef.current = el)}
          />
          {render.contactShadow > 0 && (
            <ContactShadows position={[0, -1.05, 0]} opacity={render.contactShadow} scale={6} blur={2.4} far={2} />
          )}
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={8} />
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={render.bloom.intensity}
            luminanceThreshold={render.bloom.threshold}
            luminanceSmoothing={render.bloom.smoothing}
            kernelSize={render.bloom.kernel === 'huge' ? KernelSize.HUGE : KernelSize.LARGE}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>

      {/*
        Top row: Render label на левом краю + style chips по центру card'а.
        Reset/wireframe в правом верхнем углу — отдельным абсолютом ниже.
        Чипсы рендерятся с backdrop-blur'ом → читаются и на тёмных стилях.
      */}
      <span
        className={cn(
          'absolute top-6 left-6 z-10 text-[14px] font-medium tracking-tight',
          isDark ? 'text-white/55' : 'cs-label'
        )}
      >
        Render
      </span>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <StyleSelector />
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-1.5">
        <Tooltip content="Reset camera view">
          <button
            onClick={() => setResetSignal((s) => s + 1)}
            aria-label="Reset camera view"
            className={cn(
              'h-9 w-9 inline-flex items-center justify-center rounded-full border-[1.5px] backdrop-blur transition-colors',
              isDark
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                : 'border-text/15 bg-white/70 text-text hover:border-text hover:bg-text hover:text-white'
            )}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content={wireframe ? 'Hide wireframe' : 'Show wireframe'}>
          <button
            onClick={() => setWireframe((w) => !w)}
            aria-label={wireframe ? 'Hide wireframe' : 'Show wireframe'}
            aria-pressed={wireframe}
            className={cn(
              'h-9 w-9 inline-flex items-center justify-center rounded-full border-[1.5px] backdrop-blur transition-colors',
              wireframe
                ? 'border-text bg-accent text-accent-bold'
                : isDark
                  ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                  : 'border-text/15 bg-white/70 text-text hover:border-text hover:bg-text hover:text-white'
            )}
          >
            <Layers className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2">
        <Tooltip
          content={
            isEmpty
              ? 'Draw something first'
              : published
                ? 'Already published to gallery'
                : publishing
                  ? 'Saving to gallery…'
                  : 'Publish to public gallery'
          }
        >
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
        </Tooltip>

        <Tooltip
          content={
            isEmpty
              ? 'Draw something first'
              : exportingGif
                ? `Recording GIF · ${Math.round(gifProgress * 100)}%`
                : 'Export 4s loop as animated GIF'
          }
        >
          <Button
            variant="secondary"
            onClick={onExportGif}
            disabled={isEmpty || exportingGif}
            className={cn(
              // Match Publish (cs-btn--accent) dimensions so the two CTAs sit on the same baseline.
              '!h-11 !px-[22px] !text-[13px] !font-light tracking-[0.02em] lowercase',
              isDark &&
                '!text-white !border-white/40 hover:!border-white hover:!text-white hover:!bg-white/15'
            )}
          >
            {exportingGif ? (
              <>
                <span className="flex gap-1"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /></span>
                <span>{Math.round(gifProgress * 100)}%</span>
              </>
            ) : (
              <>
                <FileVideo className="h-[18px] w-[18px]" />
                GIF
              </>
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function LivePixelModel({
  styleId,
  wireframe,
  resetSignal,
  registerCapture,
  registerCanvas
}: {
  styleId: StyleId;
  wireframe: boolean;
  resetSignal: number;
  registerCapture: (fn: () => string | null) => void;
  registerCanvas: (el: HTMLCanvasElement | null) => void;
}) {
  const { pixels, size, version } = useEditor();
  const { gl, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    registerCapture(() => {
      try { return gl.domElement.toDataURL('image/png'); } catch { return null; }
    });
    registerCanvas(gl.domElement as HTMLCanvasElement);
    return () => registerCanvas(null);
  }, [gl, registerCapture, registerCanvas]);

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

  return (
    <group ref={groupRef}>
      <group scale={fit.scale} position={[-fit.cx * fit.scale, -fit.cy * fit.scale, -fit.cz * fit.scale]}>
        <StyledInstances cubes={cubes} styleId={styleId} wireframe={wireframe} />
      </group>
    </group>
  );
}

function useStyleAnimation(ref: React.RefObject<THREE.Group>, styleId: StyleId) {
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
        g.rotation.y += dt * 0.3;
        g.position.y = Math.sin(t * 1.0) * 0.05;
        break;
      case 'breathe': {
        const s = 1 + Math.sin(t * 2.2) * 0.04;
        g.scale.set(s, s, s);
        g.rotation.y += dt * 0.18;
        break;
      }
      case 'tiltSpin':
        g.rotation.y += dt * 0.45;
        g.rotation.z = Math.sin(t * 1.6) * 0.087;
        break;
      case 'pulse':
        g.rotation.y += dt * 0.25;
        flickerRef.current += dt;
        if (flickerRef.current > 0.08) {
          // Микро-пульсация яркости через ambient — для wireframe-неона
          // (mesh basic не реагирует на свет, но wireframe с basic тоже —
          // вместо этого пульсируем масштаб edges-объёма)
          const s = 1 + Math.sin(t * 6) * 0.015;
          g.scale.set(s, s, s);
          flickerRef.current = 0;
        }
        break;
      case 'flutter': {
        g.rotation.y += dt * 0.15;
        g.rotation.z = Math.sin(t * 2.4) * 0.04;
        g.position.y = Math.sin(t * 1.8) * 0.04;
        break;
      }
    }
  });
}
