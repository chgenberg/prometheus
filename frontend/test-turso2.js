const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = 'libsql://prometheus-poker-chgenberg.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTAxMDkwMTYsImlkIjoiNmZhNmVlMTctMDdmMi00YzZkLWI1ZjYtYjMzM2FkMWY5M2JjIiwicmlkIjoiYjNhMzhhNTQtZTI2My00OWY2LThmOTctOTIxOWFlMGZmZDcwIn0.UzqBB_BUpjvr2hIgSNEnJScuBNuOZZDJsD2kygffqndsjhQ3DmoIfD9tnN62xb0TNSDE_rKpwtYCQw2MjdbJAg';

async function testPlayersQuery() {
  console.log('Creating Turso client...');
  
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  const query = `
    SELECT 
      m.player_id,
      m.total_hands,
      m.net_win_bb,
      v.vpip,
      v.pfr,
      ps.avg_score as avg_postflop_score,
      pr.avg_score as avg_preflop_score,
      ai.intention_score,
      ai.collution_score,
      ai.bad_actor_score
    FROM main m
    LEFT JOIN vpip_pfr v ON m.player_id = v.player_id
    LEFT JOIN postflop_scores ps ON m.player_id = ps.player_id
    LEFT JOIN preflop_scores pr ON m.player_id = pr.player_id
    LEFT JOIN ai_scores ai ON m.player_id = ai.player_id
    WHERE m.player_id LIKE 'CoinPoker%'
    ORDER BY m.total_hands DESC
    LIMIT 2
  `;

  try {
    console.log('Testing players query...');
    const result = await client.execute(query);
    console.log('Query successful!');
    console.log('Columns:', result.columns);
    console.log('Rows:', result.rows);
    console.log('First row:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPlayersQuery(); 