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
    const logOutput: string[] = [];

    logOutput.push(`Purging staging test data from production...`);

    // 1. Clean 'bookings' collection
    const stagingBookingIds: string[] = [];
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${srcProjectId}/databases/(default)/documents/bookings?pageSize=1000`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const result = await response.json();
        if (result.documents) {
          result.documents.forEach((doc: any) => {
            const docId = doc.name.split('/').pop();
            stagingBookingIds.push(docId);
          });
        }
      }
      logOutput.push(`✓ Found ${stagingBookingIds.length} test bookings on staging.`);
    } catch (e: any) {
      logOutput.push(`❌ Error loading staging bookings: ${e.message}`);
    }

    // 2. Clean 'pages' collection (only bookings, waivers, locks, customers)
    const stagingPageTestDocIds: string[] = [];
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${srcProjectId}/databases/(default)/documents/pages?pageSize=1000`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const result = await response.json();
        if (result.documents) {
          result.documents.forEach((doc: any) => {
            const docId = doc.name.split('/').pop();
            const fields = parseFirestoreFields(doc.fields || {});
            
            // Only flag for deletion if it is a transaction/guest document, not a page layout
            const testTypes = ['booking', 'waiver_signature', 'lock', 'customer'];
            if (testTypes.includes(fields.type)) {
              stagingPageTestDocIds.push(docId);
            }
          });
        }
      }
      logOutput.push(`✓ Found ${stagingPageTestDocIds.length} test customer/waiver/booking docs in 'pages' on staging.`);
    } catch (e: any) {
      logOutput.push(`❌ Error loading staging pages: ${e.message}`);
    }

    // 3. Execute Deletions on Production
    let bookingsDeleted = 0;
    let pageDocsDeleted = 0;

    // Delete bookings
    if (stagingBookingIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < stagingBookingIds.length; i += batchSize) {
        const batch = adminDb.batch();
        const chunk = stagingBookingIds.slice(i, i + batchSize);

        chunk.forEach(docId => {
          const docRef = adminDb.collection('bookings').doc(docId);
          batch.delete(docRef);
        });

        await batch.commit();
        bookingsDeleted += chunk.length;
      }
      logOutput.push(`✓ Purged ${bookingsDeleted} test bookings from production database.`);
    }

    // Delete transaction docs in pages collection
    if (stagingPageTestDocIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < stagingPageTestDocIds.length; i += batchSize) {
        const batch = adminDb.batch();
        const chunk = stagingPageTestDocIds.slice(i, i + batchSize);

        chunk.forEach(docId => {
          const docRef = adminDb.collection('pages').doc(docId);
          batch.delete(docRef);
        });

        await batch.commit();
        pageDocsDeleted += chunk.length;
      }
      logOutput.push(`✓ Purged ${pageDocsDeleted} test customer/waiver/booking pages from production database.`);
    }

    return NextResponse.json({
      success: true,
      message: 'Purge of staging test data completed successfully!',
      purged: {
        bookings: bookingsDeleted,
        pageDocs: pageDocsDeleted
      },
      log: logOutput
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to translate Firestore REST fields to normal objects
function parseFirestoreFields(fields: any): any {
  const result: any = {};
  for (const key in fields) {
    const valObj = fields[key];
    const type = Object.keys(valObj)[0];
    result[key] = valObj[type];
  }
  return result;
}
