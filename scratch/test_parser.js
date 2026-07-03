const https = require('https');

function parseFirestoreValue(value) {
  if (!value) return null;
  
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('nullValue' in value) return null;
  
  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map((v) => parseFirestoreValue(v));
  }
  
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    const result = {};
    for (const key in fields) {
      result[key] = parseFirestoreValue(fields[key]);
    }
    return result;
  }
  
  return null;
}

function parseFirestoreFields(fields) {
  const result = {};
  if (!fields) return result;
  for (const key in fields) {
    result[key] = parseFirestoreValue(fields[key]);
  }
  return result;
}

const url = 'https://firestore.googleapis.com/v1/projects/mywhiskey-97620/databases/(default)/documents/settings/global';

https.get(url, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const fields = parseFirestoreFields(parsed.fields);
      console.log('Successfully parsed settings:');
      console.log(JSON.stringify(fields, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
