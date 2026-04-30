import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return NextResponse.json({
    hasMeshy: Boolean(process.env.MESHY_API_KEY),
    hasBlob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    hasPostgres: Boolean(process.env.POSTGRES_URL)
  });
}
