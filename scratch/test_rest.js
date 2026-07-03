const https = require('https');

const url = 'https://firestore.googleapis.com/v1/projects/mywhiskey-97620/databases/(default)/documents/pages/sun-set-cruise';

https.get(url, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Document ID:', parsed.name ? parsed.name.split('/').pop() : 'Not found');
      console.log('Fields present:', parsed.fields ? Object.keys(parsed.fields) : 'None');
      if (parsed.fields && parsed.fields.title) {
        console.log('Title:', parsed.fields.title.stringValue);
      }
    } catch (e) {
      console.log('Raw output:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
