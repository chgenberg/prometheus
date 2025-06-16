// Simple API test script
const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📡 GET ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      console.log(`📊 Data preview:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log(`🚨 Error:`, data);
    }
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Test health endpoint
  await testAPI('/api/health', 'Health Check');
  
  // Test metrics endpoint
  await testAPI('/api/metrics', 'System Metrics');
  
  // Test players endpoint
  await testAPI('/api/players?page=0&limit=5', 'Players List (Paginated)');
  
  // Test chat endpoint
  await testAPI('/api/chat', 'Chat API (should fail without POST)');
  
  console.log('\n🏁 Tests completed!');
  console.log('\n💡 To test chat API properly, use:');
  console.log('curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d \'{"message":"Who is the best player?"}\'');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

module.exports = { testAPI, runTests }; 