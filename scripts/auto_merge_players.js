#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Automated Player Data Merge Script
 * Run this after each data scraping/import to clean and merge player data
 */

class PlayerDataMerger {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async runUpdate(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async mergePlayerData() {
    console.log('🔄 Starting automated player data merge...');
    
    try {
      // Step 1: Get statistics before merge
      const beforeStats = await this.runQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN player_id LIKE 'coinpoker/%' THEN 1 END) as slash_format,
          COUNT(CASE WHEN player_id LIKE 'coinpoker-%' THEN 1 END) as dash_format,
          COUNT(CASE WHEN player_id NOT LIKE 'coinpoker%' THEN 1 END) as other_format
        FROM main
      `);
      
      console.log('📊 Before merge:', beforeStats[0]);

      // Step 2: Merge AI scores from dash to slash format
      console.log('🔀 Merging AI scores...');
      const mergeUpdates = await this.runUpdate(`
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
          )
        WHERE player_id LIKE 'coinpoker/%'
      `);
      
      console.log(`✅ Updated ${mergeUpdates} player records with AI scores`);

      // Step 3: Clean up duplicate records
      console.log('🧹 Cleaning up duplicate records...');
      const dashDeleted = await this.runUpdate(`DELETE FROM main WHERE player_id LIKE 'coinpoker-%'`);
      const otherDeleted = await this.runUpdate(`DELETE FROM main WHERE player_id NOT LIKE 'coinpoker/%'`);
      
      console.log(`🗑️ Deleted ${dashDeleted} dash-format records`);
      console.log(`🗑️ Deleted ${otherDeleted} non-player records`);

      // Step 4: Update timestamps
      await this.runUpdate(`UPDATE main SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);

      // Step 5: Optimize database
      console.log('⚡ Optimizing database...');
      await this.runUpdate('VACUUM');
      await this.runUpdate('ANALYZE');

      // Step 6: Get final statistics
      const afterStats = await this.runQuery(`
        SELECT 
          COUNT(*) as total_players,
          SUM(total_hands) as total_hands,
          AVG(total_hands) as avg_hands_per_player,
          COUNT(CASE WHEN avg_postflop_score > 0 THEN 1 END) as players_with_ai_scores,
          COUNT(CASE WHEN bad_actor_score > 0 THEN 1 END) as players_with_security_scores,
          MAX(total_hands) as max_hands,
          MIN(total_hands) as min_hands
        FROM main
      `);

      console.log('🎉 Merge completed successfully!');
      console.log('📈 Final statistics:', afterStats[0]);

      return afterStats[0];

    } catch (error) {
      console.error('❌ Error during merge:', error);
      throw error;
    }
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

// Main execution
async function main() {
  const dbPath = process.argv[2] || path.join(process.cwd(), 'heavy_analysis.db');
  
  console.log(`🎯 Target database: ${dbPath}`);
  
  const merger = new PlayerDataMerger(dbPath);
  
  try {
    await merger.connect();
    const results = await merger.mergePlayerData();
    
    // Performance metrics
    console.log('\n📊 Performance Summary:');
    console.log(`- Total active players: ${results.total_players}`);
    console.log(`- Total hands analyzed: ${results.total_hands}`);
    console.log(`- Average hands per player: ${Math.round(results.avg_hands_per_player)}`);
    console.log(`- Players with AI scores: ${results.players_with_ai_scores}`);
    console.log(`- Players with security analysis: ${results.players_with_security_scores}`);
    console.log(`- Hand range: ${results.min_hands} - ${results.max_hands}`);
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await merger.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PlayerDataMerger; 