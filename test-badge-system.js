// Quick test script for badge system endpoints
// Run this after starting the server to test badge functionality

const BASE_URL = 'http://localhost:3000';

// Test credentials (you'll need to use actual login tokens)
const TEST_TOKEN = 'your_jwt_token_here';

const testBadgeEndpoints = async () => {
  console.log('🧪 Testing Badge Management System...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get all badges
    console.log('1️⃣ Testing GET /api/badges');
    const badgesResponse = await fetch(`${BASE_URL}/api/badges`, {
      method: 'GET',
      headers
    });
    const badgesData = await badgesResponse.json();
    console.log('✅ All badges:', badgesData.success ? `Found ${badgesData.data?.total || 0} badges` : 'Failed');
    console.log();

    // Test 2: Get user's badges
    console.log('2️⃣ Testing GET /api/badges/my-badges');
    const myBadgesResponse = await fetch(`${BASE_URL}/api/badges/my-badges`, {
      method: 'GET',
      headers
    });
    const myBadgesData = await myBadgesResponse.json();
    console.log('✅ My badges:', myBadgesData.success ? `Earned ${myBadgesData.data?.total || 0} badges` : 'Failed');
    console.log();

    // Test 3: Create a badge (admin only)
    console.log('3️⃣ Testing POST /api/badges (Admin only)');
    const createBadgeResponse = await fetch(`${BASE_URL}/api/badges`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Badge',
        description: 'A test badge for verification',
        imageUrl: 'https://example.com/test-badge.png',
        leagueId: 'your_league_id_here' // Replace with actual league ID
      })
    });
    const createBadgeData = await createBadgeResponse.json();
    console.log('✅ Create badge:', createBadgeData.success ? 'Success' : `Failed: ${createBadgeData.error}`);
    console.log();

    // Test 4: Get badge analytics (admin only)
    console.log('4️⃣ Testing GET /api/badges/analytics (Admin only)');
    const analyticsResponse = await fetch(`${BASE_URL}/api/badges/analytics`, {
      method: 'GET',
      headers
    });
    const analyticsData = await analyticsResponse.json();
    console.log('✅ Badge analytics:', analyticsData.success ? 'Success' : `Failed: ${analyticsData.error}`);
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Instructions for running the test
console.log(`
🔧 SETUP INSTRUCTIONS:

1. Start the OpenLearn server:
   npm run dev

2. Login to get a JWT token:
   POST /api/auth/login
   
3. Replace TEST_TOKEN above with your actual JWT token

4. Replace 'your_league_id_here' with an actual league ID

5. Run this test:
   node test-badge-system.js

📋 EXPECTED RESULTS:
- Regular users can view badges and their own earned badges
- Admin users (Chief Pathfinder+) can create badges and view analytics
- All endpoints should return proper JSON responses
- Badge creation requires valid league ID
`);

// Uncomment the line below after setting up the token
// testBadgeEndpoints();
