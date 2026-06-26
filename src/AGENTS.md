# Source-Level Code Guardrails & Conventions

This document contains local coding standards and strict implementation rules for files inside `/src/`. All agents and developers must adhere to these policies.

---

## 1. Firebase & Database Operations

*   **Server-Side SDK (`firebase-admin`)**:
    *   Do not initialize the Firebase Admin SDK inside individual files. Always import and query through the central helper: [adminDb.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/lib/adminDb.ts).
    *   This prevents `FirebaseAppError: The default Firebase app already exists` errors during Serverless execution.
*   **Client-Side SDK (`firebase/firestore`, etc.)**:
    *   Only import client-side Firebase functions inside files marked with the `'use client'` directive.
    *   Refer to [db.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/lib/db.ts) for client-side queries.

---

## 2. API Endpoints (`src/app/api/`)

*   **Security & Authorization**:
    *   All endpoints under `/api/admin/` must enforce session/authorization checks. Reject requests missing credentials with `401 Unauthorized`.
*   **Response Standards**:
    *   All API routes must return JSON with standardized structures.
    *   **Success Response**: `{ success: true, ...data }`
    *   **Error Response**: `{ success: false, error: "Human readable message" }`
    *   Always use appropriate HTTP status codes:
        *   `200 OK` or `201 Created` for success.
        *   `400 Bad Request` for invalid input parameters.
        *   `401 Unauthorized` for missing/invalid authentication.
        *   `403 Forbidden` for lack of administrative permissions.
        *   `500 Internal Server Error` for unhandled runtime exceptions.

---

## 3. Styling & Styling Tokens

*   Style rules must respect the design system tokens.
*   When editing component files, utilize the CSS variables defined in [globals.css](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/globals.css) (e.g. `color: var(--color-primary)`).
*   Avoid hardcoding arbitrary hex color values (such as `#d97706` or `#0a0a0a`) in inline styles. Use the variables to maintain light/dark theme support.
