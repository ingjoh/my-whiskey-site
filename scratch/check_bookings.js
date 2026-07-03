async function run() {
  const projectId = 'my-whiskey-prod';
  
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

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pages?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch documents: ${res.status}`);
    return;
  }

  const data = await res.json();
  const documents = data.documents || [];
  const bookings = [];

  for (const doc of documents) {
    const fields = doc.fields || {};
    const type = fields.type?.stringValue;
    if (type === 'booking') {
      const parsed = {};
      for (const key in fields) {
        parsed[key] = parseValue(fields[key]);
      }
      const docId = doc.name.split('/').pop();
      bookings.push({
        docId,
        id: parsed.id,
        guestName: parsed.guestName,
        guestEmail: parsed.guestEmail,
        status: parsed.status,
        token: parsed.token,
        amountPaidToday: parsed.amountPaidToday,
        amountDueLater: parsed.amountDueLater,
        grandTotal: parsed.grandTotal
      });
    }
  }

  console.log(`TOTAL BOOKINGS FOUND: ${bookings.length}`);
  console.log(JSON.stringify(bookings, null, 2));
}

run().catch(console.error);
