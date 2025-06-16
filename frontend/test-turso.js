const { createClient } = require('@libsql/client');

const TURSO_DATABASE_URL = 'libsql://prometheus-poker-chgenberg.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTAxMDkwMTYsImlkIjoiNmZhNmVlMTctMDdmMi00YzZkLWI1ZjYtYjMzM2FkMWY5M2JjIiwicmlkIjoiYjNhMzhhNTQtZTI2My00OWY2LThmOTctOTIxOWFlMGZmZDcwIn0.UzqBB_BUpjvr2hIgSNEnJScuBNuOZZDJsD2kygffqndsjhQ3DmoIfD9tnN62xb0TNSDE_rKpwtYCQw2MjdbJAg';

async function testTurso() {
  console.log('Creating Turso client...');
  
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  try {
    console.log('Testing simple query...');
    const result = await client.execute('SELECT COUNT(*) as total FROM main WHERE player_id LIKE "CoinPoker%"');
    console.log('Query successful!');
    console.log('Result:', result);
    console.log('Total CoinPoker players:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

testTurso(); 