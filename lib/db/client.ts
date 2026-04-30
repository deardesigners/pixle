import { sql } from '@vercel/postgres';

export const db = sql;

export type GenerationRow = {
  id: string;
  client_id: string;
  style_id: string;
  pixel_data: { size: number; pixels: number[][] };
  preview_url: string;
  thumbnail_url: string;
  model_url: string;
  meshy_task_id: string | null;
  status: string;
  created_at: string;
};
