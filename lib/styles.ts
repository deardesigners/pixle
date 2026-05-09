import type { StyleId } from './validation';

export type IdleAnimation =
  | 'float'
  | 'breathe'
  | 'tiltSpin'
  | 'pulse'
  | 'flutter'
  | 'rotate';

export type StylePreset = {
  id: StyleId;
  label: string;
  emoji: string;
  description: string;
  idleAnimation: IdleAnimation;
};

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  voxel: {
    id: 'voxel',
    label: 'Voxel',
    emoji: '🧊',
    description: 'Chunky stacked cubes',
    idleAnimation: 'float'
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    emoji: '🌃',
    description: 'Glowing tubes in the dark',
    idleAnimation: 'pulse'
  },
  mercury: {
    id: 'mercury',
    label: 'Mercury',
    emoji: '🪞',
    description: 'Liquid chrome blob',
    idleAnimation: 'rotate'
  },
  dhl: {
    id: 'dhl',
    label: 'DHL',
    emoji: '📦',
    description: 'Yellow parcel branded with DHL logo',
    idleAnimation: 'float'
  },
  disco: {
    id: 'disco',
    label: 'Disco',
    emoji: '🪩',
    description: 'Saturated cubes with wild rainbow bloom',
    idleAnimation: 'tiltSpin'
  }
};

export const STYLE_LIST: StylePreset[] = Object.values(STYLE_PRESETS);

export type StyleRenderConfig = {
  background: string;
  ambient: number;
  directional: number;
  envIntensity: number;
  envPreset: 'apartment' | 'sunset' | 'studio' | 'warehouse' | 'city' | 'night';
  contactShadow: number;
  /** Параметры bloom-постпроцессинга для этого стиля. */
  bloom: {
    intensity: number;
    threshold: number;
    smoothing: number;
    kernel: 'large' | 'huge';
  };
};

export const STYLE_RENDER: Record<StyleId, StyleRenderConfig> = {
  voxel:   { background: '#F3F0FF', ambient: 1.2, directional: 0.35, envIntensity: 0.05, envPreset: 'apartment', contactShadow: 0.5, bloom: { intensity: 0.45, threshold: 0.85, smoothing: 0.4, kernel: 'large' } },
  neon:    { background: '#07070F', ambient: 1.8, directional: 0.0,  envIntensity: 0,    envPreset: 'night',     contactShadow: 0,   bloom: { intensity: 1.4,  threshold: 0.2,  smoothing: 0.4, kernel: 'large' } },
  mercury: { background: '#161B26', ambient: 0.3, directional: 0.45, envIntensity: 1.6,  envPreset: 'warehouse', contactShadow: 0,   bloom: { intensity: 0.45, threshold: 0.85, smoothing: 0.4, kernel: 'large' } },
  dhl:     { background: '#FFCC00', ambient: 1.4, directional: 0.4,  envIntensity: 0.2,  envPreset: 'apartment', contactShadow: 0.5, bloom: { intensity: 0.45, threshold: 0.85, smoothing: 0.4, kernel: 'large' } },
  disco:   { background: '#000000', ambient: 1.0, directional: 0.0,  envIntensity: 0,    envPreset: 'night',     contactShadow: 0,   bloom: { intensity: 2.2,  threshold: 0.55, smoothing: 0.5, kernel: 'huge'  } }
};
