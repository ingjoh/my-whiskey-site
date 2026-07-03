import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (id) {
      const docRef = adminDb.collection('settlements').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: `Settlement ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: docSnap.data() });
    }

    const snapshot = await adminDb.collection('settlements')
      .where('tenantId', '==', tenantId)
      .get();

    const settlements = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: settlements });
  } catch (error: any) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
