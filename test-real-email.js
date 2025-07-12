// Real notification test - specifically for email functionality
const testRealEmail = async () => {
  const API_BASE = 'http://localhost:5001/api';
  
  console.log('📧 Testing REAL Email Notification...\n');

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
      
      // Test real email sending
      console.log('\n📧 Sending REAL test email...');
      const emailResponse = await fetch(`${API_BASE}/notifications/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testType: 'email',
          testData: {
            to: 'agrawalakshit36@gmail.com',
            subject: '🎉 Real Test Email from Ghar App',
            message: 'This is a REAL test email sent from the Ghar App notification system. If you receive this, the email service is working perfectly!'
          }
        })
      });

      const emailData = await emailResponse.json();
      
      if (emailData.success) {
        console.log('✅ REAL email sent successfully!');
        console.log('📧 Check your email inbox:', emailData.result.to);
        console.log('📋 Email details:', emailData.result);
      } else {
        console.log('❌ Email sending failed:', emailData.message);
      }
      
      // Test notification health check
      console.log('\n🏥 Checking notification service health...');
      const healthResponse = await fetch(`${API_BASE}/notifications/health`);
      const healthData = await healthResponse.json();
      
      console.log('Service Status:', healthData.status);
      console.log('Email Service:', healthData.services.email);
      console.log('SMS Service:', healthData.services.sms);
      console.log('WhatsApp Service:', healthData.services.whatsapp);
      
    } else {
      console.log('❌ Admin login failed:', loginData.message);
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }

  console.log('\n🏁 Real email test completed!');
  console.log('📧 If email was sent successfully, check your inbox for the test email.');
};

// Run the test
testRealEmail();
