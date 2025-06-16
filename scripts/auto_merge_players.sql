-- Automated Player Data Merge Script
-- Run this after each data import to merge duplicate player formats

-- Step 1: Merge AI scores from dash format to slash format
UPDATE main 
SET 
  avg_postflop_score = COALESCE(
    (SELECT dash.avg_postflop_score 
     FROM main dash 
     WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
     AND dash.avg_postflop_score > main.avg_postflop_score), 
    avg_postflop_score
  ),
  bad_actor_score = COALESCE(
    (SELECT dash.bad_actor_score 
     FROM main dash 
     WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
     AND dash.bad_actor_score > main.bad_actor_score), 
    bad_actor_score
  ),
  intention_score = COALESCE(
    (SELECT dash.intention_score 
     FROM main dash 
     WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
     AND dash.intention_score > main.intention_score), 
    intention_score
  ),
  collution_score = COALESCE(
    (SELECT dash.collution_score 
     FROM main dash 
     WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
     AND dash.collution_score > main.collution_score), 
    collution_score
  )
WHERE player_id LIKE 'coinpoker/%';

-- Step 2: Clean up duplicate dash format records
DELETE FROM main WHERE player_id LIKE 'coinpoker-%';

-- Step 3: Clean up non-player records (hand history data)
DELETE FROM main WHERE player_id NOT LIKE 'coinpoker/%';

-- Step 4: Update statistics
UPDATE main SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Step 5: Optimize database
VACUUM;
ANALYZE;

-- Report results
SELECT 
  'MERGE COMPLETE' as status,
  COUNT(*) as total_players,
  SUM(total_hands) as total_hands,
  AVG(total_hands) as avg_hands_per_player,
  COUNT(CASE WHEN avg_postflop_score > 0 THEN 1 END) as players_with_ai_scores,
  COUNT(CASE WHEN bad_actor_score > 0 THEN 1 END) as players_with_security_scores
FROM main; 