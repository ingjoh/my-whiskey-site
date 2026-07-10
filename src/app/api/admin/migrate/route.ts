import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Helper to parse Firestore REST fields structure to plain JavaScript objects
function parseRestDocument(fields: any): any {
  const result: any = {};
  for (const key in fields) {
    result[key] = parseRestValue(fields[key]);
  }
  return result;
}

function parseRestValue(valueObj: any): any {
  const type = Object.keys(valueObj)[0];
  const value = valueObj[type];

  switch (type) {
    case 'stringValue':
      return value;
    case 'booleanValue':
      return value;
    case 'integerValue':
      return parseInt(value, 10);
    case 'doubleValue':
      return parseFloat(value);
    case 'timestampValue':
      return value;
    case 'nullValue':
      return null;
    case 'arrayValue':
      return (value.values || []).map((v: any) => parseRestValue(v));
    case 'mapValue':
      return parseRestDocument(value.fields || {});
    case 'geoPointValue':
      return { latitude: value.latitude, longitude: value.longitude };
    default:
      return value;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'Tuamotu2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const srcProjectId = 'mywhiskey-97620';
    const COLLECTIONS_TO_MIGRATE = [
      'workspaces',
      'workspace_configurations',
      'pages',
      'settings',
      'templates',
      'assets',
      'content_types',
      'content_items'
    ];

    const sourceDocuments: Record<string, any[]> = {};
    const logOutput: string[] = [];

    logOutput.push(`Fetching staging collections from ${srcProjectId}...`);

    for (const colName of COLLECTIONS_TO_MIGRATE) {
      sourceDocuments[colName] = [];
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${srcProjectId}/databases/(default)/documents/${colName}?pageSize=500`;
        const response = await fetch(url, { next: { revalidate: 0 } });
        if (response.ok) {
          const result = await response.json();
          if (result.documents) {
            result.documents.forEach((doc: any) => {
              const docId = doc.name.split('/').pop();
              const parsedData = parseRestDocument(doc.fields || {});
              sourceDocuments[colName].push({
                id: docId,
                data: parsedData
              });
            });
          }
          logOutput.push(`✓ Fetched ${sourceDocuments[colName].length} documents from "${colName}"`);
        } else {
          logOutput.push(`⚠️ Warning: Failed to fetch "${colName}" (Status: ${response.status})`);
        }
      } catch (error: any) {
        logOutput.push(`❌ Error fetching "${colName}": ${error.message}`);
      }
    }

    logOutput.push('\nWriting collections to production Firestore database...');
    let totalCopied = 0;

    for (const colName of COLLECTIONS_TO_MIGRATE) {
      const docs = sourceDocuments[colName] || [];
      if (docs.length === 0) continue;

      const batchSize = 100;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = adminDb.batch();
        const chunk = docs.slice(i, i + batchSize);

        chunk.forEach(docInfo => {
          const docRef = adminDb.collection(colName).doc(docInfo.id);
          batch.set(docRef, docInfo.data, { merge: true });
        });

        await batch.commit();
        totalCopied += chunk.length;
      }
      logOutput.push(`✓ Committed ${docs.length} documents to production "${colName}"`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database migrated successfully!',
      totalCopied,
      log: logOutput
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
