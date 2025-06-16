-- Bulk Import Script for Large Datasets
-- Use this for importing 100,000+ records efficiently

-- Step 1: Disable triggers temporarily for bulk import
PRAGMA foreign_keys = OFF;
DROP TRIGGER IF EXISTS auto_merge_player_data;

-- Step 2: Import all your data here
-- INSERT INTO main (...) VALUES (...);
-- (Your bulk import statements)

-- Step 3: Bulk merge after import (much faster)
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
  )
WHERE player_id LIKE 'coinpoker/%';

-- Step 4: Clean up
DELETE FROM main WHERE player_id LIKE 'coinpoker-%';
DELETE FROM main WHERE player_id NOT LIKE 'coinpoker/%';

-- Step 5: Recreate trigger for future imports
CREATE TRIGGER auto_merge_player_data 
AFTER INSERT ON main
WHEN NEW.player_id LIKE 'coinpoker-%'
BEGIN
  UPDATE main 
  SET 
    avg_postflop_score = COALESCE(NEW.avg_postflop_score, avg_postflop_score),
    bad_actor_score = COALESCE(NEW.bad_actor_score, bad_actor_score),
    intention_score = COALESCE(NEW.intention_score, intention_score)
  WHERE player_id = 'coinpoker/' || SUBSTR(NEW.player_id, 11);
  
  DELETE FROM main WHERE player_id = NEW.player_id;
END;

-- Step 6: Optimize
PRAGMA foreign_keys = ON;
VACUUM;
ANALYZE; 