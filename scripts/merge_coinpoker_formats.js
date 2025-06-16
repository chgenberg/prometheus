const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'heavy_analysis3.db');

console.log('🔀 Starting Coinpoker format merge...');

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// Function to merge player data
function mergePlayerData() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Analyzing data distribution...');
        
        // First get statistics
        db.get(`
            SELECT 
                (SELECT COUNT(*) FROM main WHERE player_id LIKE 'coinpoker/%') as slash_count,
                (SELECT COUNT(*) FROM main WHERE player_id LIKE 'coinpoker-%') as dash_count,
                (SELECT SUM(total_hands) FROM main WHERE player_id LIKE 'coinpoker/%') as slash_hands,
                (SELECT SUM(total_hands) FROM main WHERE player_id LIKE 'coinpoker-%') as dash_hands
        `, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Data distribution:`);
            console.log(`   Slash format (coinpoker/): ${stats.slash_count} players, ${stats.slash_hands} hands`);
            console.log(`   Dash format (coinpoker-): ${stats.dash_count} players, ${stats.dash_hands} hands`);
            
            // Merge strategy: Update slash format with data from dash format
            console.log('🔄 Merging data from dash format to slash format...');
            
            db.run(`
                UPDATE main 
                SET 
                    avg_postflop_score = COALESCE(
                        (SELECT dash.avg_postflop_score 
                         FROM main dash 
                         WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
                         AND dash.avg_postflop_score > main.avg_postflop_score), 
                        avg_postflop_score
                    ),
                    avg_preflop_score = COALESCE(
                        (SELECT dash.avg_preflop_score 
                         FROM main dash 
                         WHERE dash.player_id = 'coinpoker-' || SUBSTR(main.player_id, 11) 
                         AND dash.avg_preflop_score > main.avg_preflop_score), 
                        avg_preflop_score
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
                WHERE player_id LIKE 'coinpoker/%'
            `, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('✅ Data merge completed');
                
                // Clean up duplicate dash format records
                console.log('🗑️ Removing duplicate dash format records...');
                
                db.run(`DELETE FROM main WHERE player_id LIKE 'coinpoker-%'`, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    console.log('✅ Duplicate records removed');
                    
                    // Get final statistics
                    db.get(`
                        SELECT 
                            COUNT(*) as total_players,
                            SUM(total_hands) as total_hands,
                            COUNT(CASE WHEN avg_postflop_score > 0 THEN 1 END) as players_with_ai_scores,
                            COUNT(CASE WHEN bad_actor_score > 0 THEN 1 END) as players_with_security_scores,
                            AVG(bad_actor_score) as avg_security_score
                        FROM main WHERE player_id LIKE 'coinpoker/%'
                    `, (err, finalStats) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        console.log('\n🎉 Merge completed successfully!');
                        console.log('📈 Final statistics:');
                        console.log(`   Total players: ${finalStats.total_players}`);
                        console.log(`   Total hands: ${finalStats.total_hands}`);
                        console.log(`   Players with AI scores: ${finalStats.players_with_ai_scores}`);
                        console.log(`   Players with security scores: ${finalStats.players_with_security_scores}`);
                        console.log(`   Average security score: ${finalStats.avg_security_score?.toFixed(1) || 'N/A'}`);
                        
                        resolve(finalStats);
                    });
                });
            });
        });
    });
}

// Run the merge
mergePlayerData()
    .then(() => {
        console.log('\n✨ Player data merge completed successfully!');
        db.close();
    })
    .catch((error) => {
        console.error('❌ Merge failed:', error);
        db.close();
        process.exit(1);
    }); 