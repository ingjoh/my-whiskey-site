---
type: ADR
title: "ADR-003: Logical Tenant Data Isolation"
description: "Logical tenant isolation boundary strategy, physical field naming conventions, and query-level security rules."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-003: Logical Tenant Data Isolation

## Status
Accepted

## Context
As the platform evolves from a single-vendor booking manager (Motor Yacht Whiskey) into a multi-tenant platform (supporting operators, partnerships, and brokers), data isolation is a critical concern. 

We require a database strategy that:
1.  Ensures data security and privacy between different tenants.
2.  Maintains low infrastructure complexity and operational overhead.
3.  Allows global cross-tenant indexing for marketplace search (e.g. searching across multiple fleet operators).
4.  Preserves structural database flexibility for future branding or regional divisions without requiring breaking database migrations.

## Alternatives Considered
*   **Alternative A: Physical Isolation (Multi-Database / Dynamic Firestore Instances)**: Provides strong security isolation, but prohibits unified marketplace queries, increases setup/maintenance overhead, and scales poorly with thousands of individual partners or agents.
*   **Alternative B: Hardcoded Organization-Level Logical Isolation (Using `organizationId`)**: Simple for V1.0, but hard-couples the technical tenant isolation boundary with the legal Organization entity. If an Organization later operates multiple brands, regions, or sub-divisions, extensive database schema changes and API revisions would be required.

## Decision
We adopt **Logical Tenant Data Isolation** within a single Firestore database using the following rules:

1.  **Logical Isolation Field (`tenantId`)**: All tenant-scoped documents (Bookings, Proposals, Vessels, Gear, Blackouts, etc.) must include a generic `tenantId` attribute in their physical database schema rather than `organizationId`.
2.  **Version 1.0 Tenant Mapping**: For Version 1.0, the `tenantId` maps one-to-one to the active Organization ID. The business language continues to use Organization, but the persistence layer remains decoupled.
3.  **Strict Logical Isolation Enforcement**: 
    *   **At the Database Level**: Firestore Security Rules (`firestore.rules`) will reject any read or write request that does not match the active `tenantId` claim stored on the authenticated user's Firebase Custom Auth Claims.
    *   **At the API Level**: All Next.js route handlers and server components must explicitly filter database reads and writes using the active user's active tenant scope.
4.  **Marketplace Indexes**: Publicly shareable data (such as public vessel listings and adventure details) can omit `tenantId` filters during read operations, but write operations are strictly restricted to the owning tenant.

## Rationale
Using a generic `tenantId` field at the physical schema layer provides the perfect balance of implementation simplicity and long-term structural flexibility. It allows a single database setup to scale to thousands of tenants, enables cross-tenant marketplace search, and leaves a clean, non-breaking upgrade path open for multi-brand or multi-region organization structures.
