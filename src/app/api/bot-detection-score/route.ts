import { NextResponse } from 'next/server';
import { Database } from 'sqlite';
import { getHeavyDb } from '../../../lib/database-heavy';

// --- TYPDEDEFINITIONER FÖR DATABASOBJEKT ---
interface Player {
    player_id: string;
}
interface TiltEvent {
    tilt_events_count: number;
    avg_agg_increase: number | null;
}
interface PlayerStats {
    vpip: number;
    pfr: number;
    cbet_flop: number;
    cbet_turn: number;
    cbet_river: number;
    aggression_factor: number;
    avg_bet_size_flop: number;
    avg_bet_size_turn: number;
    avg_bet_size_river: number;
}
interface SessionAnalysis {
    duration_minutes: number;
    hands_played: number;
    time_of_day_category: string;
    fatigue_score: number;
}
interface PlayerVariance {
    avg_variance: number;
    total_downswings: number;
}
interface TimingPattern {
    avg_time_per_hand: number | null;
}
interface BotScoreResult {
    player_id: string;
    bot_score: number;
    classification: string;
    recommended_action: string;
    raw_scores: Record<string, number>;
}


// Kategori-vikter enligt specifikation
const categoryWeights: Record<string, number> = {
    tilt_emotional_response: 2.0,
    preflop_consistency: 1.0,
    postflop_precision: 1.0,
    bet_sizing_robotics: 1.0,
    timing_patterns: 2.0,
    session_behavior: 1.0,
    circadian_rhythm: 1.0,
    variance_handling: 1.5,
    economic_robotics: 1.0,
    intention_precision: 1.0,
    showdown_anomaly: 1.0,
    positional_precision: 1.0,
    optimal_play_adherence: 1.0,
    multi_table_consistency: 1.0, // Placeholder
    decision_quality: 1.0,
    multi_dimensional_consistency: 1.0, // Placeholder
    lack_of_human_traits: 1.0, // Placeholder
    meta_game_absence: 1.0, // Placeholder
};

const TOTAL_WEIGHT = Object.values(categoryWeights).reduce((sum, weight) => sum + weight, 0);

// Helper function to clamp score between 1 and 10
const clampScore = (score: number): number => Math.max(1, Math.min(10, score));

// --- Scoring Functions ---

// 1. Tilt & Emotionell Respons
async function scoreTiltAndEmotionalResponse(db: Database, playerId: string): Promise<number> {
    const res = await db.get<TiltEvent>('SELECT COUNT(*) as tilt_events_count, AVG(aggression_increase) as avg_agg_increase FROM tilt_events WHERE player_id = ?', playerId);
    if (!res || (res.tilt_events_count === 0 && res.avg_agg_increase === null)) {
        return 10; // Inga tilt-events, perfekt robot-beteende
    }
    let score = 10 - (res.tilt_events_count * 2) - ((res.avg_agg_increase || 0) * 5);
    return clampScore(score);
}

// 2 & 3. Preflop/Postflop Konsistens/Precision (player_stats)
async function scoreConsistencyAndPrecision(db: Database, playerId: string): Promise<number> {
    const stats = await db.get<PlayerStats>('SELECT vpip, pfr, cbet_flop, cbet_turn, cbet_river, aggression_factor FROM player_stats WHERE player_id = ?', playerId);
    if (!stats) return 1;

    const vpip_pfr_ratio = stats.pfr > 0 ? stats.vpip / stats.pfr : 1;
    const cbet_consistency = Math.abs(stats.cbet_flop - stats.cbet_turn) + Math.abs(stats.cbet_turn - stats.cbet_river);

    let score = 0;
    if (vpip_pfr_ratio > 1.2 && vpip_pfr_ratio < 2.5) score += 2; else score += 8; // GTO är ofta runt 1.5-2.0
    if (cbet_consistency < 10) score += 8; else if (cbet_consistency < 25) score += 5; else score += 2; // Låg varians = bot
    
    return clampScore(score / 2);
}


// 4. Bet Sizing Robotik
async function scoreBetSizingRobotics(db: Database, playerId: string): Promise<number> {
    const res = await db.get<PlayerStats>('SELECT avg_bet_size_flop, avg_bet_size_turn, avg_bet_size_river FROM player_stats WHERE player_id = ?', playerId);
     if (!res || !res.avg_bet_size_flop) return 1;
    const variance = Math.abs(res.avg_bet_size_flop - res.avg_bet_size_turn) + Math.abs(res.avg_bet_size_turn - res.avg_bet_size_river);
    if (variance < 0.1) return 10; // Extremt konsistent
    if (variance < 0.5) return 7;
    return 3;
}

// 5. Timing-mönster (simulerad, kräver event-level timestamps)
async function scoreTimingPatterns(db: Database, playerId: string): Promise<number> {
    // Denna är svår utan event-timestamps. Vi simulerar baserat på sessionsdata.
    const res = await db.get<TimingPattern>('SELECT AVG(duration_minutes / hands_played) as avg_time_per_hand FROM session_analysis WHERE player_id = ?', playerId);
    if (!res || !res.avg_time_per_hand) return 5; // Neutral
    const time_per_hand = res.avg_time_per_hand * 60; // sekunder
    if (time_per_hand > 5 && time_per_hand < 10) return 9; // Robot-intervall
    if (time_per_hand < 3 || time_per_hand > 20) return 2; // Mänskligt
    return 6;
}

// 6 & 7. Session Beteende & Circadian Rytm
async function scoreSessionAndCircadian(db: Database, playerId: string): Promise<number> {
    const sessions = await db.all<SessionAnalysis[]>('SELECT duration_minutes, time_of_day_category, fatigue_score FROM session_analysis WHERE player_id = ?', playerId);
    if (sessions.length < 5) return 3; // För lite data

    const uniqueDurations = new Set(sessions.map(s => s.duration_minutes)).size;
    const nightSessions = sessions.filter(s => s.time_of_day_category === 'night' || s.time_of_day_category === 'late_night').length;
    const avgFatigue = sessions.reduce((acc, s) => acc + s.fatigue_score, 0) / sessions.length;
    
    let score = 0;
    if (uniqueDurations / sessions.length < 0.3) score += 9; else score += 2; // Låg varians i längd = bot
    if (nightSessions / sessions.length > 0.5) score += 8; else score += 3; // Spelar omänskliga tider
    if (avgFatigue < 0.1) score += 9; else score += 2; // Blir aldrig trött
    
    return clampScore(score / 3);
}

// 8. Variance Hantering
async function scoreVarianceHandling(db: Database, playerId: string): Promise<number> {
    const res = await db.get<PlayerVariance>('SELECT AVG(variance_bb) as avg_variance, SUM(is_downswing) as total_downswings FROM player_variance_windows WHERE player_id = ?', playerId);
    if (!res) return 1;
    let score = 0;
    if (res.avg_variance < 100) score += 9; else if (res.avg_variance < 300) score += 5; else score += 2;
    if (res.total_downswings === 0) score += 9; else if (res.total_downswings < 3) score += 4; else score += 1;
    return clampScore(score / 2);
}

// ... Fler scoring-funktioner skulle implementeras här för varje kategori

function getClassification(score: number): { class: string; action: string } {
    if (score <= 20) return { class: 'Människa', action: 'Ingen flagg' };
    if (score <= 40) return { class: 'Disciplinerad', action: 'Passiv bevakning' };
    if (score <= 60) return { class: 'Misstänkt', action: 'Snabbgranskning' };
    if (score <= 80) return { class: 'Hög risk', action: 'Full audit' };
    return { class: 'Kritisk', action: 'Auto-ban / refund-review' };
}


export async function GET() {
    let db: Database | null = null;
    try {
        console.log("Initializing heavy database for bot detection...");
        db = await getHeavyDb();
        
        console.log("Fetching all players...");
        const players = await db.all<Player[]>('SELECT player_id FROM player_stats');
        console.log(`Found ${players.length} players to analyze.`);

        const results: BotScoreResult[] = [];

        for (const player of players) {
            const playerId = player.player_id;

            // Samla råa poäng
            const rawScores: Record<string, number> = {
                tilt_emotional_response: await scoreTiltAndEmotionalResponse(db, playerId),
                preflop_consistency: await scoreConsistencyAndPrecision(db, playerId), // Används för båda
                postflop_precision: await scoreConsistencyAndPrecision(db, playerId), // Samma funktion
                bet_sizing_robotics: await scoreBetSizingRobotics(db, playerId),
                timing_patterns: await scoreTimingPatterns(db, playerId),
                session_behavior: await scoreSessionAndCircadian(db, playerId), // Kombinerad
                circadian_rhythm: await scoreSessionAndCircadian(db, playerId), // Samma funktion
                variance_handling: await scoreVarianceHandling(db, playerId),
                // Placeholders för resten
                economic_robotics: 5,
                intention_precision: 5,
                showdown_anomaly: 5,
                positional_precision: 5,
                optimal_play_adherence: 5,
                multi_table_consistency: 5,
                decision_quality: 5,
                multi_dimensional_consistency: 5,
                lack_of_human_traits: 5,
                meta_game_absence: 5,
            };

            // Beräkna viktad summa
            let weightedSum = 0;
            for (const category in rawScores) {
                weightedSum += rawScores[category] * categoryWeights[category];
            }

            // Normalisera BotScore
            const botScore = 100 * (weightedSum / (10 * TOTAL_WEIGHT));

            const classification = getClassification(botScore);

            results.push({
                player_id: playerId,
                bot_score: parseFloat(botScore.toFixed(2)),
                classification: classification.class,
                recommended_action: classification.action,
                raw_scores: rawScores
            });
        }
        
        // Sortera efter högst bot-score
        results.sort((a, b) => b.bot_score - a.bot_score);

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Error in bot-detection-score API:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    } finally {
        if (db) {
            await db.close();
        }
    }
} 