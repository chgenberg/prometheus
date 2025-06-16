import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration',
    message: 'Chat API is being migrated to Turso cloud database'
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    error: 'This endpoint is temporarily disabled during migration', 
    message: 'Chat API is being migrated to Turso cloud database'
  }, { status: 503 });
} 