import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration',
    message: 'Synergistic Bot Hunter is being migrated to Turso cloud database'
  }, { status: 503 });
} 