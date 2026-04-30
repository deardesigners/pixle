import type { StyleId } from './validation';

export type StylePreset = {
  id: StyleId;
  label: string;
  emoji: string;
  description: string;
  meshyArtStyle: 'realistic' | 'sculpture';
  meshyTopology: 'triangle' | 'quad';
  meshyTargetPolycount: number;
  promptModifier: string;
  idleAnimation:
    | 'float'
    | 'rotate'
    | 'pulse'
    | 'tiltSpin'
    | 'flicker'
    | 'static';
};

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  voxel: {
    id: 'voxel',
    label: 'Voxel',
    emoji: '🧊',
    description: 'Кубический Minecraft-style',
    meshyArtStyle: 'sculpture',
    meshyTopology: 'quad',
    meshyTargetPolycount: 5000,
    promptModifier: 'voxel art, cubic blocks, 8-bit aesthetic',
    idleAnimation: 'float'
  },
  lowpoly: {
    id: 'lowpoly',
    label: 'Low Poly',
    emoji: '📐',
    description: 'Граненая геометрия',
    meshyArtStyle: 'sculpture',
    meshyTopology: 'triangle',
    meshyTargetPolycount: 3000,
    promptModifier: 'low poly, faceted geometry, flat shading',
    idleAnimation: 'rotate'
  },
  claymation: {
    id: 'claymation',
    label: 'Claymation',
    emoji: '🟤',
    description: 'Пластилиновая лепка',
    meshyArtStyle: 'sculpture',
    meshyTopology: 'triangle',
    meshyTargetPolycount: 12000,
    promptModifier: 'claymation, plasticine sculpture, soft surface',
    idleAnimation: 'pulse'
  },
  toon: {
    id: 'toon',
    label: 'Toon',
    emoji: '🎨',
    description: 'Cel-shading c обводкой',
    meshyArtStyle: 'sculpture',
    meshyTopology: 'triangle',
    meshyTargetPolycount: 8000,
    promptModifier: 'cel-shaded, toon shader, bold outlines',
    idleAnimation: 'tiltSpin'
  },
  holographic: {
    id: 'holographic',
    label: 'Holographic',
    emoji: '✨',
    description: 'Прозрачная голограмма',
    meshyArtStyle: 'sculpture',
    meshyTopology: 'triangle',
    meshyTargetPolycount: 6000,
    promptModifier: 'holographic, translucent, iridescent emissive',
    idleAnimation: 'flicker'
  },
  stone: {
    id: 'stone',
    label: 'Stone',
    emoji: '🗿',
    description: 'Каменная статуя',
    meshyArtStyle: 'realistic',
    meshyTopology: 'triangle',
    meshyTargetPolycount: 15000,
    promptModifier: 'stone statue, weathered granite, monumental',
    idleAnimation: 'static'
  }
};

export const STYLE_LIST: StylePreset[] = Object.values(STYLE_PRESETS);
