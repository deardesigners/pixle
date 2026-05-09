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
    description: 'Glowing wireframe in the dark',
    idleAnimation: 'pulse'
  },
  mercury: {
    id: 'mercury',
    label: 'Mercury',
    emoji: '🪞',
    description: 'Liquid chrome blob',
    idleAnimation: 'rotate'
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
};

export const STYLE_RENDER: Record<StyleId, StyleRenderConfig> = {
  voxel:   { background: '#F3F0FF', ambient: 1.2, directional: 0.35, envIntensity: 0.05, envPreset: 'apartment', contactShadow: 0.5 },
  neon:    { background: '#07070F', ambient: 1.8, directional: 0.0, envIntensity: 0,    envPreset: 'night',     contactShadow: 0 },
  mercury: { background: '#161B26', ambient: 0.3, directional: 0.45, envIntensity: 1.6,  envPreset: 'warehouse', contactShadow: 0 }
};
