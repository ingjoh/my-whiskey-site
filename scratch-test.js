

async function test() {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/mywhiskey-97620/databases/(default)/documents/settings/global");
    const json = await res.json();
    console.log("FIELDS:", JSON.stringify(json.fields, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
