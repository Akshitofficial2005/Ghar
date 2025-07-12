// Test SMS and WhatsApp notifications
const testSMSWhatsApp = async () => {
  const API_BASE = 'http://localhost:5001/api';
  
  console.log('📱 Testing SMS and WhatsApp Notifications...\n');

  try {
    // Login as admin
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
      
      const token = loginData.token;
      
      // Test SMS sending
      console.log('\n📱 Testing SMS notification...');
      const smsResponse = await fetch(`${API_BASE}/notifications/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testType: 'sms',
          testData: {
            phone: '+919907002817', // Use a real phone number for testing
            message: 'Test SMS from Ghar App - SMS notification system is working!'
          }
        })
      });

      const smsData = await smsResponse.json();
      console.log('SMS Result:', smsData);
      
      // Test WhatsApp sending
      console.log('\n💬 Testing WhatsApp notification...');
      const whatsappResponse = await fetch(`${API_BASE}/notifications/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testType: 'whatsapp',
          testData: {
            phone: '+919907002817', // Use a real phone number for testing
            message: 'Test WhatsApp from Ghar App - WhatsApp notification system is working!'
          }
        })
      });

      const whatsappData = await whatsappResponse.json();
      console.log('WhatsApp Result:', whatsappData);
      
    } else {
      console.log('❌ Admin login failed:', loginData.message);
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }

  console.log('\n🏁 SMS and WhatsApp tests completed!');
};

// Run the test
testSMSWhatsApp();
