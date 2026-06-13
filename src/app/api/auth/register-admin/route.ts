import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

const ADMIN_EMAIL_WHITELIST = [
  'ingjohs@gmail.com',
  'ingjoh@gmail.com',
  'ingemar.johnsson@gmail.com',
  'ingemar.johnsson@tribes.co'
];

function isWhitelisted(email?: string): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  
  // Explicit emails
  if (ADMIN_EMAIL_WHITELIST.includes(cleanEmail)) {
    return true;
  }
  
  // Domains
  if (cleanEmail.endsWith('@motoryachtwhiskey.com') || cleanEmail.endsWith('@mywhiskey.com') || cleanEmail.endsWith('@projects.vercel.app')) {
    return true;
  }
  
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err: any) {
      console.error('Error verifying ID token in register-admin API:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email, uid } = decodedToken;

    if (isWhitelisted(email)) {
      // Check if custom claims already set
      if (!decodedToken.admin) {
        console.log(`Setting custom admin claim for whitelisted user ${email} (${uid})`);
        await adminAuth.setCustomUserClaims(uid, { admin: true });
        return NextResponse.json({ success: true, adminGranted: true, message: 'Custom claim admin=true granted.' });
      } else {
        return NextResponse.json({ success: true, adminGranted: false, message: 'User already has admin claim.' });
      }
    }

    return NextResponse.json({ success: true, adminGranted: false, message: 'Email not whitelisted for admin claims.' });
  } catch (err: any) {
    console.error('Unhandled error in register-admin API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
