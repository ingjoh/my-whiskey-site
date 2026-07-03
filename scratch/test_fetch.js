const http = require('http');

http.get('http://localhost:3000/coastal-adventure', (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    // Find the title tag
    const titleMatch = data.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      console.log(`Title tag: ${titleMatch[1]}`);
    } else {
      console.log('No title tag found');
    }
    
    if (res.statusCode === 200 && titleMatch && !titleMatch[1].includes('Page Not Found')) {
      console.log('Page loaded successfully!');
    } else {
      console.log('Failed to load page correctly.');
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
