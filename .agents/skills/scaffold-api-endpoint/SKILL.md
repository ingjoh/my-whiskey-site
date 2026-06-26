---
name: scaffold-api-endpoint
description: Create a standardized Next.js App Router API endpoint with error handling and authentication checks
---

# Scaffold API Endpoint Playbook

Use this skill when you need to scaffold a new API endpoint route under `src/app/api/`.

---

## 1. Directory & Naming
*   Create a folder matching the endpoint path (e.g. `src/app/api/admin/social-ads/meta/`) and name the route file `route.ts`.
*   Ensure that the path reflects the resource name and scope (e.g. all admin operations under `/api/admin/`).

---

## 2. Code Structure Template

API routes must follow the Next.js App Router conventions:

```typescript
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/adminDb';

// Example POST request handler
export async function POST(request: Request) {
  try {
    // 1. Authorization check
    // (Ensure session token check or admin user validation goes here)
    const isAdmin = true; // Placeholder for actual auth check
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await request.json();
    const { param1 } = body;

    if (!param1) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: param1' },
        { status: 400 }
      );
    }

    // 3. Database operations using server-side adminDb
    // const docRef = await adminDb.collection('some_collection').add({ param1 });

    // 4. Return success JSON response
    return NextResponse.json({
      success: true,
      message: 'Operation completed successfully',
      data: { param1 }
    });

  } catch (error: any) {
    console.error('API Error in route.ts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```
