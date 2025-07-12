// Test script for notification panel functionality
const testNotifications = async () => {
  const API_BASE = 'http://localhost:5001/api';
  
  console.log('🧪 Testing Notification Panel Functionality...\n');

  // Test 1: Admin Login
  console.log('1️⃣ Testing Admin Login...');
  try {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'agrawalakshit36@gmail.com',
        password: 'akshit@Mayank2003'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginData.message === 'Login successful' && loginData.token) {
      console.log('✅ Admin login successful');
      console.log('Token received:', loginData.token ? 'Yes' : 'No');
      console.log('User role:', loginData.user?.role);
      
      const token = loginData.token;
      
      // Test 2: Send Test Notification
      console.log('\n2️⃣ Testing Send Test Notification...');
      try {
        const testNotificationResponse = await fetch(`${API_BASE}/notifications/send-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            testType: 'email',
            testData: {
              to: 'agrawalakshit36@gmail.com',
              subject: 'Test Notification from Ghar App',
              message: 'This is a test notification to verify the system is working properly.'
            }
          })
        });

        const testNotificationData = await testNotificationResponse.json();
        
        if (testNotificationData.success) {
          console.log('✅ Test notification sent successfully');
        } else {
          console.log('❌ Test notification failed:', testNotificationData.message);
        }
      } catch (error) {
        console.log('❌ Test notification error:', error.message);
      }

      // Test 3: Send Bulk Promo
      console.log('\n3️⃣ Testing Send Bulk Promo Notification...');
      try {
        const bulkPromoResponse = await fetch(`${API_BASE}/notifications/send-bulk-promo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            promoContent: {
              title: 'Special Offer - 20% Off!',
              message: 'Book your PG accommodation with Ghar and get 20% off on your first month. Limited time offer!',
              ctaText: 'Book Now',
              ctaLink: 'https://gharfr.vercel.app'
            }
          })
        });

        const bulkPromoData = await bulkPromoResponse.json();
        
        if (bulkPromoData.success) {
          console.log('✅ Bulk promo notification sent successfully');
          console.log('Results:', bulkPromoData.results);
        } else {
          console.log('❌ Bulk promo notification failed:', bulkPromoData.message);
        }
      } catch (error) {
        console.log('❌ Bulk promo notification error:', error.message);
      }

    } else {
      console.log('❌ Admin login failed:', loginData.message);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }

  console.log('\n🏁 Notification tests completed!');
};

// Run the tests
testNotifications();
