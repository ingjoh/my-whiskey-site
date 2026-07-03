import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';
    const type = searchParams.get('type');

    let q = adminDb.collection('resources').where('tenantId', '==', tenantId);
    if (type) {
      q = q.where('type', '==', type);
    }

    const snapshot = await q.get();
    const resources = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: resources });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      type,
      category,
      status = 'active',
      physicalConfig,
      humanConfig,
      tenantId = 'org-whiskey'
    } = body;

    if (!name || !type || !category) {
      return NextResponse.json({ error: 'Missing required fields: name, type, category' }, { status: 400 });
    }

    const resourceId = id || `res_${Math.floor(100000 + Math.random() * 900000)}`;
    const docRef = adminDb.collection('resources').doc(resourceId);
    const existing = await docRef.get();
    const now = new Date().toISOString();

    const data = {
      id: resourceId,
      tenantId,
      name,
      type,
      category,
      status,
      ...(physicalConfig && { physicalConfig }),
      ...(humanConfig && { humanConfig }),
      createdAt: existing.exists ? existing.data()?.createdAt : now,
      updatedAt: now
    };

    await docRef.set(data);
    return NextResponse.json({ success: true, message: 'Resource saved successfully', data });
  } catch (error: any) {
    console.error('Error saving resource:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
