---
name: define-domain-entity
description: Establish a new database entity model or schema in Firestore, ensuring alignment with TAXONOMY.md
---

# Define Domain Entity Playbook

Use this skill when you need to introduce a new database collection, entity schema, or domain model in the codebase.

---

## 1. Terminology Compliance Check
*   Before creating any schema files, you **must** read [TAXONOMY.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/docs/domain/TAXONOMY.md).
*   Ensure all new properties, collections, and sub-attributes match the vocabulary definitions. For example, if defining a guest detail field, name it `guestName` (not `userName` or `customerName`).

---

## 2. Define TypeScript Interfaces
Always define a clear TypeScript interface for database entities. Save model typings in a centralized place or alongside the database helper.

```typescript
export interface BaseEntity {
  id?: string;
  createdAt: string; // ISO String or Firestore Timestamp
  updatedAt: string;
}

export interface Booking extends BaseEntity {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  vesselSlug: string; // References Asset where isVessel === true
  adventureId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled';
  totalPrice: number;
}
```

---

## 3. Standardize Timestamping & Slugs
*   **Timestamps**: Every document must include `createdAt` and `updatedAt` fields. Update `updatedAt` during every write/merge operation.
*   **Identifiers**: Use URL-safe, lowercase slugs with hyphens (e.g., `destin-sunset-cruise` or `whiskey-charter`) rather than random strings where entities are referenced in routes.
