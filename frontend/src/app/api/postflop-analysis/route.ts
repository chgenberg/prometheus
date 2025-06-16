import { NextResponse } from 'next/server';
import { getHeavyPostflopAnalysis } from '@/lib/database-heavy';

export async function GET() {
  try {
    const result = await getHeavyPostflopAnalysis();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Postflop analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch postflop analysis data' },
      { status: 500 }
    );
  }
} 