declare module 'gifenc' {
  export type Gif8bitChannel = 'rgb444' | 'rgb565' | 'rgba4444';

  export type GifPalette = number[][];

  export type GifEncoderHandle = {
    writeFrame: (
      indexed: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: GifPalette;
        delay?: number;
        repeat?: number;
        transparent?: boolean;
        transparentIndex?: number;
        dispose?: number;
      }
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoderHandle;
  export function quantize(
    rgba: Uint8Array,
    maxColors: number,
    options?: { format?: Gif8bitChannel; oneBitAlpha?: boolean }
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8Array,
    palette: GifPalette,
    format?: Gif8bitChannel
  ): Uint8Array;
}
