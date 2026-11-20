import axios from 'axios';

async function testCsvChat() {
  try {
    console.log('1. Registering/Logging in test user...');
    let token;
    try {
      const reg = await axios.post('http://localhost:5000/api/auth/register', {
        name: 'CSV Tester',
        email: `tester_${Date.now()}@example.com`,
        password: 'Password123!',
      });
      token = reg.data.token;
    } catch (e) {
      console.log('Registration error:', e.response?.data || e.message);
      return;
    }

    console.log('2. Sending CSV message...');
    const csvContent = `Url,Status,Confidence,Source
http://malicious.com,Phishing,98,PhishAlert
http://google.com,Legitimate,99,PhishAlert
http://paypal-update.com,Phishing,95,PhishAlert
http://github.com,Legitimate,100,PhishAlert
http://bank-login.xyz,Phishing,91,PhishAlert`;

    const payload = {
      message: 'Analyze this spreadsheet and create an interactive bar chart.',
      attachments: [
        {
          name: 'Dataset(PhishAlert).csv',
          type: 'text/csv',
          size: csvContent.length,
          content: csvContent,
          text: csvContent,
        },
      ],
    };

    const res = await axios.post('http://localhost:5000/api/chat/message', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });

    console.log('SUCCESS!');
    console.log('Status:', res.status);
    console.log('Has AI Message:', !!res.data.aiMessage);
    console.log('Content preview:', res.data.aiMessage?.content?.slice(0, 300));
    console.log('Has ChartConfig:', !!res.data.chartConfig);
    console.log('ChartConfig:', JSON.stringify(res.data.chartConfig, null, 2));
  } catch (err) {
    console.error('FAILED WITH ERROR:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error message:', err.message);
    }
  }
}

testCsvChat();
