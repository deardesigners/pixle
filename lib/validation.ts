import { z } from 'zod';

export const StyleIdSchema = z.enum([
  'voxel',
  'neon',
  'mercury',
  'dhl'
]);

export const PixelDataSchema = z.object({
  size: z.number().int().min(8).max(128),
  pixels: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()]))
});

export const LikeBodySchema = z.object({
  clientId: z.string().min(8)
});

export const GalleryQuerySchema = z.object({
  style: StyleIdSchema.optional(),
  mine: z.string().optional(),
  clientId: z.string().optional(),
  sort: z.enum(['recent', 'popular']).default('recent'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24)
});

export type PixelData = z.infer<typeof PixelDataSchema>;
export type StyleId = z.infer<typeof StyleIdSchema>;
