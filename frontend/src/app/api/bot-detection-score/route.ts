import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

interface BotScoreResult {
    player_id: string;
    bot_score: number;
    classification: string;
    recommended_action: string;
    raw_scores: {
        timing_consistency: number;
        action_patterns: number;
        statistical_anomaly: number;
        gto_adherence: number;
        session_patterns: number;
    };
}

export async function GET(request: NextRequest) {
    try {
        // Find database using multiple possible paths
        const possiblePaths = [
            path.join(process.cwd(), 'heavy_analysis3.db'), // Primary Vercel production path
            './heavy_analysis3.db', // Alternative production path  
            path.join(process.cwd(), '..', 'heavy_analysis3.db'), // Development path
        ];
        
        let dbPath: string | null = null;
        for (const testPath of possiblePaths) {
            const fs = require('fs');
            if (fs.existsSync(testPath)) {
                dbPath = testPath;
                break;
            }
        }
        
        if (!dbPath) {
            throw new Error('Database file not found');
        }
        
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // Get top players by bot score (using bad_actor_score as bot_score)
        const players = await db.all(`
            SELECT 
                player_id,
                bad_actor_score as bot_score,
                vpip,
                pfr,
                total_hands,
                intention_score,
                collution_score
            FROM main 
            WHERE player_id LIKE 'coinpoker/%' 
            AND bad_actor_score IS NOT NULL 
            ORDER BY bad_actor_score DESC 
            LIMIT 50
        `);
        
        await db.close();
        
        if (players.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No bot scores calculated yet.",
                results: [],
                summary: {
                    total_players_with_scores: 0,
                    high_risk: 0,
                    medium_risk: 0,
                    low_risk: 0,
                    average_score: 0,
                }
            });
        }
        
        // Transform players into BotScoreResult format
        const results: BotScoreResult[] = players.map((player: any) => {
            const score = player.bot_score;
            
            // Classify based on score
            let classification = 'Normal';
            let recommended_action = 'Continue monitoring';
            
            if (score > 80) {
                classification = 'Kritisk';
                recommended_action = 'Immediate investigation required';
            } else if (score > 60) {
                classification = 'Hög risk';
                recommended_action = 'Flag for detailed review';
            } else if (score > 40) {
                classification = 'Misstänkt';
                recommended_action = 'Monitor closely';
            }
            
            // Generate raw scores based on player stats
            const raw_scores = {
                timing_consistency: Math.min(10, (100 - Math.abs(player.vpip - 25)) / 10),
                action_patterns: Math.min(10, (player.intention_score || 50) / 10),
                statistical_anomaly: Math.min(10, Math.abs(player.vpip - 28) / 3),
                gto_adherence: Math.min(10, Math.abs(player.pfr - 20) / 2),
                session_patterns: Math.min(10, Math.min(player.total_hands / 1000, 10))
            };
            
            return {
                player_id: player.player_id,
                bot_score: score,
                classification,
                recommended_action,
                raw_scores
            };
        });
        
        // Calculate summary statistics
        let high_risk = 0;
        let medium_risk = 0;
        let low_risk = 0;
        const total_score = results.reduce((acc, result) => {
            if (result.bot_score > 60) high_risk++;
            else if (result.bot_score > 40) medium_risk++;
            else low_risk++;
            return acc + result.bot_score;
        }, 0);
        
        const average_score = total_score / results.length;

        return NextResponse.json({
            success: true,
            message: "Bot scores fetched successfully.",
            results,
            summary: {
                total_players_with_scores: results.length,
                high_risk,
                medium_risk,
                low_risk,
                average_score: parseFloat(average_score.toFixed(2))
            }
        });
        
    } catch (error: any) {
        console.error('Error in bot-detection-score API:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch bot scores.',
            details: error?.message || 'Unknown error',
        }, { status: 500 });
    }
}
