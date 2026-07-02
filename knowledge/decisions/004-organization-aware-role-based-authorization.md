---
type: ADR
title: "ADR-004: Organization-Aware and Role-Based Authorization"
description: "Tenant-scoped role assignments, static permission mapping, dynamic custom auth claim sync, and Capability isolation."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-004: Organization-Aware and Role-Based Authorization

## Status
Accepted

## Context
As the platform expands to support multiple charter operators and partnerships, a user's permissions must be evaluated relative to the tenant boundary they are interacting with. A user might be an "Owner" of Organization A, a "Staff" member of Organization B, and a "Guest" in Organization C. 

We need an authorization mechanism that:
1.  Supports multi-tenancy and multiple concurrent roles per user.
2.  Maintains low latency for route-guarding and API request evaluation.
3.  Clearly separates administrative access roles (e.g., Owner, Admin) from professional skill qualifications (e.g., Captain, Chef).
4.  Ensures roles reference reusable permission definitions to facilitate long-term authorization evolution.

## Alternatives Considered
*   **Alternative A: Flat Global Roles**: Assigning global claims (like `isAdmin: true` or `isStaff: true`) to a user. This fails multi-tenancy entirely, as users cannot have scoped limits.
*   **Alternative B: Inline Document Mappings**: Storing role names and permission lists directly on the `Person` document. This leads to massive duplication, data synchronization anomalies, and slow validation joins on every single API route request.

## Decision
We adopt a **Decoupled, Organization-Aware Role-Based Authorization** model with the following components:

1.  **Separation of Roles and Role Assignments**:
    *   **Role**: A static definition mapping a structural role type (e.g. `owner`, `admin`, `dispatcher`, `scheduler`, `broker`, `guest`) to a static array of permission strings (e.g. `['read:bookings', 'write:assets']`).
    *   **Role Assignment**: A dynamic record mapping a specific `Person` to a `Role` within a defined scope (Organization ID, Partnership ID, or Platform).
2.  **Firebase Custom Claims Integration**:
    *   A server-side `/api/auth/register-session` endpoint validates the active session, queries the active `/role_assignments`, and bundles scoped roles into Firebase Custom Auth Claims (e.g., `roles: { "org_whiskey": "owner", "org_tempest": "staff" }`).
    *   Next.js route middleware and client-side page views read these claims directly from the decrypted JWT, achieving zero-latency authentication checks without database lookups.
3.  **Physical Separation of Capabilities**:
    *   Professional skill qualifications (e.g., Captain, Chef, Guide) are isolated into a separate `/capabilities` collection. 
    *   These capabilities do not grant administrative dashboard access; they are queried operationally for trip scheduling and itinerary resource assignments.
4.  **Static Permissions Mapping**:
    *   Roles reference reusable Permission definitions rather than replicating duplicate permission lists inside individual assignment documents.

## Rationale
This design provides high performance via JWT custom claims while ensuring that access control is tightly bound to logical tenant boundaries. Decoupling roles from professional capabilities simplifies operational scheduling logic, and separating role assignments from static role permission maps keeps the database schemas clean and easy to maintain as new features are added.
