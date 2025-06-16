import { NextResponse } from 'next/server';
import { getHeavyWinRateDistribution } from '../../../lib/database-heavy';

export async function GET() {
  try {
    const distribution = await getHeavyWinRateDistribution();
    
    // Format the data to match what the component expects
    const formattedData = distribution.map((item: any) => ({
      category: item.category,
      count: item.count,
      avg_winrate: item.avg_vpip, // Using VPIP as a proxy for analysis
      percentage: item.percentage
    }));
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Failed to fetch win rate distribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch win rate distribution' },
      { status: 500 }
    );
  }
} 