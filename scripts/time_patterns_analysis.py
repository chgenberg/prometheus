"""
Time-Based Patterns Analysis Plugin - Analyserar dag/natt/helg prestanda mönster
Använder estimated_play_time och time_of_day_category för djup temporal analys
"""

import sqlite3
import pandas as pd
import logging
from typing import Dict, List, Tuple, Optional
import json
from datetime import datetime, timedelta
import calendar
import time

def create_time_analysis_tables(analytics_conn: sqlite3.Connection) -> None:
    """Skapar tabeller för tidsbaserad analys."""
    
    with analytics_conn:
        # Timbaserade prestanda mönster
        analytics_conn.execute("""
            CREATE TABLE IF NOT EXISTS hourly_performance (
                player_id TEXT NOT NULL,
                hour_of_day INTEGER NOT NULL,
                
                hands_played INTEGER DEFAULT 0,
                total_volume_bb REAL DEFAULT 0,
                
                -- Performance metrics
                net_win_bb REAL DEFAULT 0,
                bb_per_100_hands REAL DEFAULT 0,
                avg_pot_size REAL DEFAULT 0,
                win_rate_percentage REAL DEFAULT 0,
                
                -- Behavioral metrics
                vpip_percentage REAL DEFAULT 0,
                pfr_percentage REAL DEFAULT 0,
                aggression_factor REAL DEFAULT 0,
                c_bet_percentage REAL DEFAULT 0,
                
                -- Risk metrics
                variance_bb REAL DEFAULT 0,
                biggest_win_bb REAL DEFAULT 0,
                biggest_loss_bb REAL DEFAULT 0,
                tilt_events_count INTEGER DEFAULT 0,
                
                -- Sizing patterns
                avg_bet_size_percentage REAL DEFAULT 0,
                overbet_frequency REAL DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, hour_of_day)
            )
        """)
        
        # Veckodagsanalys
        analytics_conn.execute("""
            CREATE TABLE IF NOT EXISTS weekday_performance (
                player_id TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,  -- 0=Monday, 6=Sunday
                day_name TEXT NOT NULL,
                
                hands_played INTEGER DEFAULT 0,
                avg_session_length_minutes REAL DEFAULT 0,
                sessions_count INTEGER DEFAULT 0,
                
                -- Performance
                net_win_bb REAL DEFAULT 0,
                bb_per_100_hands REAL DEFAULT 0,
                roi_percentage REAL DEFAULT 0,
                
                -- Behavioral differences
                vpip_percentage REAL DEFAULT 0,
                pfr_percentage REAL DEFAULT 0,
                aggression_factor REAL DEFAULT 0,
                
                -- Risk & tilt
                tilt_events_count INTEGER DEFAULT 0,
                avg_tilt_duration_minutes REAL DEFAULT 0,
                variance_bb REAL DEFAULT 0,
                
                -- Opponent analysis
                avg_opponents_skill_level REAL DEFAULT 0,
                table_selection_score REAL DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, day_of_week)
            )
        """)
        
        # Sessionsanalys
        analytics_conn.execute("""
            CREATE TABLE IF NOT EXISTS session_analysis (
                player_id TEXT NOT NULL,
                session_start TIMESTAMP NOT NULL,
                session_end TIMESTAMP,
                
                duration_minutes INTEGER DEFAULT 0,
                hands_played INTEGER DEFAULT 0,
                
                -- Performance
                net_win_bb REAL DEFAULT 0,
                bb_per_hour REAL DEFAULT 0,
                
                -- Session characteristics
                time_of_day_category TEXT,
                day_of_week INTEGER,
                is_weekend INTEGER DEFAULT 0,
                
                -- Behavioral evolution during session
                early_aggression REAL DEFAULT 0,   -- första 30 min
                late_aggression REAL DEFAULT 0,    -- sista 30 min
                aggression_change REAL DEFAULT 0,  -- skillnad
                
                -- Fatigue indicators
                fatigue_score REAL DEFAULT 0,
                decision_quality_decline REAL DEFAULT 0,
                
                -- Outcomes
                session_outcome TEXT,  -- 'winning', 'losing', 'breakeven'
                biggest_pot_won REAL DEFAULT 0,
                biggest_pot_lost REAL DEFAULT 0,
                
                -- Tilt & emotions
                tilt_events_during_session INTEGER DEFAULT 0,
                emotional_state_score REAL DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, session_start)
            )
        """)
        
        # Optimala speltider
        analytics_conn.execute("""
            CREATE TABLE IF NOT EXISTS optimal_play_times (
                player_id TEXT NOT NULL,
                
                -- Bästa prestanda tider
                best_hour_of_day INTEGER,
                best_day_of_week INTEGER,
                best_time_category TEXT,
                
                -- Performance vid optimala tider
                optimal_bb_per_100 REAL DEFAULT 0,
                optimal_win_rate REAL DEFAULT 0,
                optimal_variance REAL DEFAULT 0,
                
                -- Sämsta prestanda tider
                worst_hour_of_day INTEGER,
                worst_day_of_week INTEGER,
                worst_time_category TEXT,
                
                -- Performance vid sämsta tider
                worst_bb_per_100 REAL DEFAULT 0,
                worst_win_rate REAL DEFAULT 0,
                worst_variance REAL DEFAULT 0,
                
                -- Rekommendationer
                recommended_session_length_minutes INTEGER DEFAULT 0,
                avoid_hours TEXT,  -- JSON array med timmar att undvika
                optimal_volume_per_day INTEGER DEFAULT 0,
                
                -- Confidence metrics
                data_confidence REAL DEFAULT 0,  -- 0-100 baserat på sample size
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id)
            )
        """)

def analyze_hourly_patterns(player_id: str, analytics_conn: sqlite3.Connection, config: Dict = None) -> None:
    """Analyserar prestandamönster per timme på dygnet med config-styrning."""
    
    cursor = analytics_conn.cursor()
    
    # Använd config för minimum händer
    min_hands = config.get('hourly_min_hands', 5) if config else 5
    
    # Hämta data per timme
    cursor.execute("""
        SELECT 
            CAST(substr(h.estimated_play_time, 12, 2) AS INTEGER) as hour_of_day,
            COUNT(DISTINCT h.id) as hands,
            SUM(da.net_win) as total_net_win,
            AVG(da.net_win) as avg_net_win,
            COUNT(CASE WHEN da.action_type IN ('bet', 'raise') THEN 1 END) as aggressive_actions,
            COUNT(*) as total_actions,
            AVG(da.raise_percentage) as avg_bet_size,
            COUNT(CASE WHEN da.raise_percentage > 100 THEN 1 END) as overbets,
            AVG(da.hand_strength) as avg_hand_strength,
            AVG(da.net_win * da.net_win) - AVG(da.net_win) * AVG(da.net_win) as variance,
            MAX(da.net_win) as biggest_win,
            MIN(da.net_win) as biggest_loss
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
        GROUP BY hour_of_day
        HAVING hands >= ?
    """, (player_id, min_hands))
    
    hourly_data = cursor.fetchall()
    
    # Räkna tilt events per timme
    cursor.execute("""
        SELECT 
            CAST(substr(tilt_start_time, 12, 2) AS INTEGER) as hour_of_day,
            COUNT(*) as tilt_count
        FROM tilt_events
        WHERE player_id = ?
        GROUP BY hour_of_day
    """, (player_id,))
    
    tilt_by_hour = {row[0]: row[1] for row in cursor.fetchall()}
    
    hourly_patterns = []
    for row in hourly_data:
        (hour, hands, total_net_win, avg_net_win, aggressive_actions, 
         total_actions, avg_bet_size, overbets, avg_hand_strength, 
         variance, biggest_win, biggest_loss) = row
        
        # Beräkna metrics
        bb_per_100 = (total_net_win / hands * 100) if hands > 0 else 0
        aggression_factor = (aggressive_actions / total_actions * 100) if total_actions > 0 else 0
        overbet_frequency = (overbets / aggressive_actions * 100) if aggressive_actions > 0 else 0
        tilt_events = tilt_by_hour.get(hour, 0)
        
        hourly_patterns.append((
            player_id,
            hour,
            hands,
            float(total_net_win),  # total_volume_bb
            float(total_net_win),
            float(bb_per_100),
            float(avg_net_win),  # avg_pot_size
            0,  # win_rate_percentage - skulle behöva fler data
            0,  # vpip_percentage
            0,  # pfr_percentage
            float(aggression_factor),
            0,  # c_bet_percentage
            float(variance or 0),
            float(biggest_win),
            float(biggest_loss),
            tilt_events,
            float(avg_bet_size or 0),
            float(overbet_frequency)
        ))
    
    if hourly_patterns:
        with analytics_conn:
            analytics_conn.executemany("""
                INSERT OR REPLACE INTO hourly_performance (
                    player_id, hour_of_day, hands_played, total_volume_bb,
                    net_win_bb, bb_per_100_hands, avg_pot_size, win_rate_percentage,
                    vpip_percentage, pfr_percentage, aggression_factor, c_bet_percentage,
                    variance_bb, biggest_win_bb, biggest_loss_bb, tilt_events_count,
                    avg_bet_size_percentage, overbet_frequency
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, hourly_patterns)

def analyze_weekday_patterns(player_id: str, analytics_conn: sqlite3.Connection, config: Dict = None) -> None:
    """Analyserar prestandamönster per veckodag med config-styrning."""
    
    cursor = analytics_conn.cursor()
    
    # Använd config för minimum händer
    min_hands = config.get('weekday_min_hands', 10) if config else 10
    
    # Hämta data per veckodag
    cursor.execute("""
        SELECT 
            CAST(strftime('%w', h.estimated_play_time) AS INTEGER) as day_of_week,
            COUNT(DISTINCT h.id) as hands,
            SUM(da.net_win) as total_net_win,
            AVG(da.net_win) as avg_net_win,
            COUNT(CASE WHEN da.action_type IN ('bet', 'raise') THEN 1 END) as aggressive_actions,
            COUNT(*) as total_actions,
            AVG(da.net_win * da.net_win) - AVG(da.net_win) * AVG(da.net_win) as variance
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
        GROUP BY day_of_week
        HAVING hands >= ?
    """, (player_id, min_hands))
    
    weekday_data = cursor.fetchall()
    
    # Räkna tilt events per veckodag
    cursor.execute("""
        SELECT 
            CAST(strftime('%w', tilt_start_time) AS INTEGER) as day_of_week,
            COUNT(*) as tilt_count,
            AVG(duration_minutes) as avg_duration
        FROM tilt_events
        WHERE player_id = ?
        GROUP BY day_of_week
    """, (player_id,))
    
    tilt_by_weekday = {row[0]: {'count': row[1], 'avg_duration': row[2]} for row in cursor.fetchall()}
    
    weekday_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    weekday_patterns = []
    for row in weekday_data:
        day_of_week, hands, total_net_win, avg_net_win, aggressive_actions, total_actions, variance = row
        
        # Konvertera från SQLite format (0=Sunday) till Python format (0=Monday)
        python_day = (day_of_week + 6) % 7
        day_name = weekday_names[day_of_week]
        
        # Beräkna metrics
        bb_per_100 = (total_net_win / hands * 100) if hands > 0 else 0
        aggression_factor = (aggressive_actions / total_actions * 100) if total_actions > 0 else 0
        tilt_info = tilt_by_weekday.get(day_of_week, {'count': 0, 'avg_duration': 0})
        
        weekday_patterns.append((
            player_id,
            python_day,
            day_name,
            hands,
            0,  # avg_session_length_minutes
            0,  # sessions_count
            float(total_net_win),
            float(bb_per_100),
            0,  # roi_percentage
            0,  # vpip_percentage
            0,  # pfr_percentage
            float(aggression_factor),
            tilt_info['count'],
            float(tilt_info['avg_duration']),
            float(variance or 0),
            0,  # avg_opponents_skill_level
            0   # table_selection_score
        ))
    
    if weekday_patterns:
        with analytics_conn:
            analytics_conn.executemany("""
                INSERT OR REPLACE INTO weekday_performance (
                    player_id, day_of_week, day_name, hands_played, avg_session_length_minutes,
                    sessions_count, net_win_bb, bb_per_100_hands, roi_percentage,
                    vpip_percentage, pfr_percentage, aggression_factor,
                    tilt_events_count, avg_tilt_duration_minutes, variance_bb,
                    avg_opponents_skill_level, table_selection_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, weekday_patterns)

def detect_sessions(player_id: str, analytics_conn: sqlite3.Connection, config: Dict = None) -> None:
    """Identifierar sessioner och analyserar deras karaktär med config-styrning."""
    
    cursor = analytics_conn.cursor()
    
    # Hämta alla händer för denna spelare sorterade efter tid
    cursor.execute("""
        SELECT 
            h.estimated_play_time,
            da.net_win,
            da.action_type,
            da.raise_percentage,
            h.time_of_day_category
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
        ORDER BY h.estimated_play_time
    """, (player_id,))
    
    actions = cursor.fetchall()
    if len(actions) < 10:
        return
    
    # Konvertera till pandas för enklare sessionanalys
    df = pd.DataFrame(actions, columns=[
        'estimated_play_time', 'net_win', 'action_type', 'raise_percentage', 'time_category'
    ])
    df['estimated_play_time'] = pd.to_datetime(df['estimated_play_time'])
    
    # Identifiera sessioner - gap från config
    session_gap = config.get('session_gap_minutes', 30) if config else 30
    df['time_diff'] = df['estimated_play_time'].diff()
    session_breaks = df[df['time_diff'] > timedelta(minutes=session_gap)].index
    
    sessions = []
    session_start_idx = 0
    
    # Minimum actions per session från config
    min_actions_per_session = config.get('session_min_actions', 5) if config else 5
    
    for break_idx in list(session_breaks) + [len(df)]:
        session_data = df.iloc[session_start_idx:break_idx]
        
        if len(session_data) >= min_actions_per_session:
            session = analyze_single_session(player_id, session_data, config)
            if session:
                sessions.append(session)
        
        session_start_idx = break_idx
    
    # Insert sessions
    if sessions:
        with analytics_conn:
            analytics_conn.executemany("""
                INSERT OR REPLACE INTO session_analysis (
                    player_id, session_start, session_end, duration_minutes, hands_played,
                    net_win_bb, bb_per_hour, time_of_day_category, day_of_week, is_weekend,
                    early_aggression, late_aggression, aggression_change, fatigue_score,
                    decision_quality_decline, session_outcome, biggest_pot_won, biggest_pot_lost,
                    tilt_events_during_session, emotional_state_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sessions)

def analyze_single_session(player_id: str, session_data: pd.DataFrame, config: Dict = None) -> Optional[Tuple]:
    """Analyserar en enskild session med config-styrning."""
    
    min_actions = config.get('session_min_actions', 5) if config else 5
    min_duration = config.get('session_min_duration', 10) if config else 10
    
    if len(session_data) < min_actions:
        return None
    
    session_start = session_data['estimated_play_time'].min()
    session_end = session_data['estimated_play_time'].max()
    duration = int((session_end - session_start).total_seconds() / 60)
    
    if duration < min_duration:
        return None
    
    hands_played = len(session_data)
    net_win = session_data['net_win'].sum()
    bb_per_hour = (net_win / (duration / 60)) if duration > 0 else 0
    
    # Bestäm session outcome - thresholds från config
    win_threshold = config.get('session_win_threshold', 5) if config else 5
    loss_threshold = config.get('session_loss_threshold', -5) if config else -5
    
    if net_win > win_threshold:
        outcome = 'winning'
    elif net_win < loss_threshold:
        outcome = 'losing'
    else:
        outcome = 'breakeven'
    
    # Beräkna aggression tidigt vs sent i session
    early_actions = session_data.head(len(session_data) // 3)
    late_actions = session_data.tail(len(session_data) // 3)
    
    early_aggression = calculate_aggression_rate(early_actions)
    late_aggression = calculate_aggression_rate(late_actions)
    aggression_change = late_aggression - early_aggression
    
    # Fatigue score baserat på duration och tid på dygnet
    time_category = session_data['time_category'].mode().iloc[0] if not session_data['time_category'].empty else 'unknown'
    fatigue_score = calculate_fatigue_score(duration, time_category, config)
    
    # Övriga metrics
    biggest_win = session_data['net_win'].max()
    biggest_loss = session_data['net_win'].min()
    day_of_week = session_start.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    
    return (
        player_id,
        session_start.strftime('%Y-%m-%d %H:%M:%S'),
        session_end.strftime('%Y-%m-%d %H:%M:%S'),
        duration,
        hands_played,
        float(net_win),
        float(bb_per_hour),
        time_category,
        day_of_week,
        is_weekend,
        float(early_aggression),
        float(late_aggression),
        float(aggression_change),
        float(fatigue_score),
        0,  # decision_quality_decline
        outcome,
        float(biggest_win),
        float(biggest_loss),
        0,  # tilt_events_during_session
        0   # emotional_state_score
    )

def calculate_aggression_rate(actions_df: pd.DataFrame) -> float:
    """Beräknar aggression rate för en grupp av actions."""
    if len(actions_df) == 0:
        return 0
    
    aggressive_actions = len(actions_df[actions_df['action_type'].isin(['bet', 'raise'])])
    return (aggressive_actions / len(actions_df)) * 100

def calculate_fatigue_score(duration_minutes: int, time_category: str, config: Dict = None) -> float:
    """Beräknar fatigue score baserat på sessionlängd och tid med config-anpassning."""
    
    # Base fatigue från duration - threshold från config
    fatigue_threshold = config.get('fatigue_threshold_minutes', 300) if config else 300
    base_fatigue = min(100, duration_minutes / (fatigue_threshold / 100))
    
    # Modifier baserat på tid - från config
    time_modifiers = {
        'morning': config.get('fatigue_morning_modifier', 0.8) if config else 0.8,
        'afternoon': config.get('fatigue_afternoon_modifier', 1.0) if config else 1.0,
        'evening': config.get('fatigue_evening_modifier', 1.2) if config else 1.2,
        'night': config.get('fatigue_night_modifier', 1.5) if config else 1.5
    }
    
    time_modifier = time_modifiers.get(time_category, 1.0)
    
    return min(100, base_fatigue * time_modifier)

def calculate_optimal_times(player_id: str, analytics_conn: sqlite3.Connection, config: Dict = None) -> None:
    """Beräknar optimala speltider för spelaren med config-styrning."""
    
    cursor = analytics_conn.cursor()
    
    # Minimum händer för analys från config
    min_hands_hourly = config.get('optimal_min_hands_hourly', 20) if config else 20
    min_hands_daily = config.get('optimal_min_hands_daily', 50) if config else 50
    min_hands_category = config.get('optimal_min_hands_category', 30) if config else 30
    
    # Hitta bästa timme
    cursor.execute("""
        SELECT hour_of_day, bb_per_100_hands, variance_bb
        FROM hourly_performance
        WHERE player_id = ? AND hands_played >= ?
        ORDER BY bb_per_100_hands DESC
        LIMIT 1
    """, (player_id, min_hands_hourly))
    
    best_hour_data = cursor.fetchone()
    
    # Hitta sämsta timme
    cursor.execute("""
        SELECT hour_of_day, bb_per_100_hands, variance_bb
        FROM hourly_performance
        WHERE player_id = ? AND hands_played >= ?
        ORDER BY bb_per_100_hands ASC
        LIMIT 1
    """, (player_id, min_hands_hourly))
    
    worst_hour_data = cursor.fetchone()
    
    # Hitta bästa veckodag
    cursor.execute("""
        SELECT day_of_week, bb_per_100_hands, variance_bb
        FROM weekday_performance
        WHERE player_id = ? AND hands_played >= ?
        ORDER BY bb_per_100_hands DESC
        LIMIT 1
    """, (player_id, min_hands_daily))
    
    best_day_data = cursor.fetchone()
    
    # Hitta sämsta veckodag
    cursor.execute("""
        SELECT day_of_week, bb_per_100_hands, variance_bb
        FROM weekday_performance
        WHERE player_id = ? AND hands_played >= ?
        ORDER BY bb_per_100_hands ASC
        LIMIT 1
    """, (player_id, min_hands_daily))
    
    worst_day_data = cursor.fetchone()
    
    # Hitta bästa time_category
    cursor.execute("""
        SELECT 
            h.time_of_day_category,
            AVG(da.net_win) * 100 as bb_per_100,
            AVG(da.net_win * da.net_win) - AVG(da.net_win) * AVG(da.net_win) as variance,
            COUNT(DISTINCT h.id) as hands
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
        GROUP BY h.time_of_day_category
        HAVING hands >= ?
        ORDER BY bb_per_100 DESC
        LIMIT 1
    """, (player_id, min_hands_category))
    
    best_time_category_data = cursor.fetchone()
    
    # Hitta sämsta time_category
    cursor.execute("""
        SELECT 
            h.time_of_day_category,
            AVG(da.net_win) * 100 as bb_per_100,
            AVG(da.net_win * da.net_win) - AVG(da.net_win) * AVG(da.net_win) as variance,
            COUNT(DISTINCT h.id) as hands
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
        GROUP BY h.time_of_day_category
        HAVING hands >= ?
        ORDER BY bb_per_100 ASC
        LIMIT 1
    """, (player_id, min_hands_category))
    
    worst_time_category_data = cursor.fetchone()
    
    # Beräkna rekommendationer
    cursor.execute("""
        SELECT AVG(duration_minutes) as avg_duration
        FROM session_analysis
        WHERE player_id = ? AND session_outcome = 'winning'
    """, (player_id,))
    
    avg_winning_session = cursor.fetchone()
    default_duration = config.get('default_session_duration', 120) if config else 120
    recommended_duration = int(avg_winning_session[0]) if avg_winning_session and avg_winning_session[0] else default_duration
    
    # Identifiera timmar att undvika (tilt-benägna) - thresholds från config
    tilt_threshold = config.get('avoid_tilt_threshold', 2) if config else 2
    loss_threshold = config.get('avoid_loss_threshold', -10) if config else -10
    
    cursor.execute("""
        SELECT hour_of_day
        FROM hourly_performance
        WHERE player_id = ? AND (tilt_events_count > ? OR bb_per_100_hands < ?)
        ORDER BY tilt_events_count DESC, bb_per_100_hands ASC
    """, (player_id, tilt_threshold, loss_threshold))
    
    avoid_hours = [str(row[0]) for row in cursor.fetchall()]
    
    # Beräkna data confidence
    cursor.execute("""
        SELECT COUNT(*) as total_hands
        FROM detailed_actions da
        JOIN hands h ON da.hand_id = h.id
        WHERE da.player_id = ?
    """, (player_id,))
    
    total_hands = cursor.fetchone()[0]
    confidence_threshold = config.get('confidence_threshold_hands', 1000) if config else 1000
    data_confidence = min(100, total_hands / (confidence_threshold / 100))
    
    # Optimal volume från config
    max_volume = config.get('max_daily_volume', 500) if config else 500
    
    # Insert optimal times
    optimal_data = (
        player_id,
        best_hour_data[0] if best_hour_data else None,
        best_day_data[0] if best_day_data else None,
        best_time_category_data[0] if best_time_category_data else None,
        float(best_hour_data[1]) if best_hour_data else 0,
        0,  # optimal_win_rate
        float(best_hour_data[2]) if best_hour_data else 0,
        worst_hour_data[0] if worst_hour_data else None,
        worst_day_data[0] if worst_day_data else None,
        worst_time_category_data[0] if worst_time_category_data else None,
        float(worst_hour_data[1]) if worst_hour_data else 0,
        0,  # worst_win_rate
        float(worst_hour_data[2]) if worst_hour_data else 0,
        recommended_duration,
        json.dumps(avoid_hours),
        min(max_volume, total_hands // 10),  # optimal_volume_per_day
        float(data_confidence)
    )
    
    with analytics_conn:
        analytics_conn.execute("""
            INSERT OR REPLACE INTO optimal_play_times (
                player_id, best_hour_of_day, best_day_of_week, best_time_category,
                optimal_bb_per_100, optimal_win_rate, optimal_variance,
                worst_hour_of_day, worst_day_of_week, worst_time_category,
                worst_bb_per_100, worst_win_rate, worst_variance,
                recommended_session_length_minutes, avoid_hours, optimal_volume_per_day,
                data_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, optimal_data)

def run(new_hands: pd.DataFrame,
        raw_conn: sqlite3.Connection,
        analytics_conn: sqlite3.Connection,
        config: Dict = None) -> None:
    """Plugin entry point - kör time-based pattern analysis med config-styrning."""
    
    # Skapa tabeller
    create_time_analysis_tables(analytics_conn)
    
    if new_hands.empty:
        logging.info("time_patterns_analysis: inga nya händer att bearbeta")
        return
    
    # Minimum actions från config
    min_actions = config.get('time_patterns_min_actions', 5) if config else 5
    
    # Hitta aktiva spelare
    cursor = analytics_conn.cursor()
    cursor.execute("""
        SELECT player_id, COUNT(*) as action_count
        FROM detailed_actions 
        WHERE hand_id IN ({})
        GROUP BY player_id
        HAVING action_count >= ?
    """.format(','.join(['?' for _ in new_hands['id']])), list(new_hands['id']) + [min_actions])
    
    active_players = [row[0] for row in cursor.fetchall()]
    
    logging.info(f"time_patterns_analysis: analyserar {len(active_players)} spelare (min_actions={min_actions})")
    
    # Performance monitoring från config
    performance_alerts = config.get('performance_alerts', False) if config else False
    start_time = time.time()
    
    # Analysera varje spelare
    for player_id in active_players:
        try:
            player_start = time.time()
            
            # Analysera timbaserade mönster med config
            analyze_hourly_patterns(player_id, analytics_conn, config)
            
            # Analysera veckodagsmönster med config
            analyze_weekday_patterns(player_id, analytics_conn, config)
            
            # Identifiera och analysera sessioner med config
            detect_sessions(player_id, analytics_conn, config)
            
            # Beräkna optimala speltider med config
            calculate_optimal_times(player_id, analytics_conn, config)
            
            player_time = time.time() - player_start
            if performance_alerts and player_time > 5:
                logging.warning(f"Time patterns analysis för {player_id} tog {player_time:.2f}s")
            
        except Exception as e:
            logging.warning(f"Error analyzing time patterns for player {player_id}: {e}")
            continue
    
    total_time = time.time() - start_time
    
    # Statistik
    cursor.execute("SELECT COUNT(DISTINCT player_id) FROM hourly_performance")
    players_with_hourly = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM session_analysis")
    total_sessions = cursor.fetchone()[0]
    
    logging.info(f"time_patterns_analysis: analyserade {players_with_hourly} spelare med {total_sessions} sessioner på {total_time:.2f}s")
    logging.info("time_patterns_analysis: temporal analys komplett")
