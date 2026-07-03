const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620';
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/global`;

fetch(url, { cache: 'no-store' })
  .then(r => r.json())
  .then(json => console.log(JSON.stringify(json, null, 2)))
  .catch(console.error);
