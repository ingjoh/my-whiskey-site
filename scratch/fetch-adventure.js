const projectId = 'mywhiskey-97620';
const docId = 'content-item-destin-private-coastal-adventure';
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pages/${docId}`;

console.log('Fetching:', url);

fetch(url)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(json => {
    function parseVal(v) {
      if (!v) return null;
      if ('stringValue' in v) return v.stringValue;
      if ('booleanValue' in v) return v.booleanValue;
      if ('integerValue' in v) return parseInt(v.integerValue, 10);
      if ('doubleValue' in v) return parseFloat(v.doubleValue);
      if ('arrayValue' in v) {
        return (v.arrayValue.values || []).map(parseVal);
      }
      if ('mapValue' in v) {
        const fields = v.mapValue.fields || {};
        const res = {};
        for (const k in fields) {
          res[k] = parseVal(fields[k]);
        }
        return res;
      }
      return null;
    }

    const fields = {};
    for (const k in json.fields) {
      fields[k] = parseVal(json.fields[k]);
    }
    console.log(JSON.stringify(fields, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
