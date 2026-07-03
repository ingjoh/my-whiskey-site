async function run() {
  const projectIds = ['mywhiskey-97620', 'my-whiskey-prod'];
  
  // Helper to parse Firestore REST format
  function parseValue(val) {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('arrayValue' in val) {
      const vals = val.arrayValue.values || [];
      return vals.map(v => parseValue(v));
    }
    if ('mapValue' in val) {
      const fields = val.mapValue.fields || {};
      const res = {};
      for (const k in fields) {
        res[k] = parseValue(fields[k]);
      }
      return res;
    }
    return null;
  }

  for (const projectId of projectIds) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pages/booking-BK-808069`;
    console.log(`Checking ${projectId}...`);
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const parsed = {};
      const fields = data.fields || {};
      for (const key in fields) {
        parsed[key] = parseValue(fields[key]);
      }
      console.log(`FOUND in ${projectId}! Parsed Booking Data:`, JSON.stringify(parsed, null, 2));
      return;
    } else {
      console.log(`Not found in ${projectId} (Status: ${res.status})`);
    }
  }
}

run().catch(console.error);
