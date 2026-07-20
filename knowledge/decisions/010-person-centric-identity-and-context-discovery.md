---
type: ADR
title: "ADR-010: Person-Centric Identity and Context Discovery"
description: "Shifting client authentication from workspace-first landing to global person-centric authentication, lazy provisioning, and dynamic context discovery."
owner: "Domain"
status: "Approved"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-010: Person-Centric Identity and Context Discovery

## Status
Approved

## Context
Historically, platform interactions assumed users landed directly in a specific Workspace or Organization context. As we expand to mobile client applications and multi-tenant supply-side users (such as captains who contract for multiple operators or charter brokers who manage vessels across workspaces), this model introduces friction. Users must login, register, and onboard at the individual Person level first, after which the platform should resolve which contexts they have access to.

Furthermore, client-submitted actor IDs are a security risk; the server must verify the token and derive the identity record internally.

## Decision
1.  **Person-Centric Authentication**: Users authenticate globally. The physical `Person` record acts as the master identity anchor.
2.  **No Automatic Email Linking**: When resolving new identities, the system must never automatically link or merge a new User to an existing Person by email alone. A new Person record is created by default unless verified via a signed invitation token or verified contact method.
3.  **Idempotent Resolution endpoint**: Expose an idempotent `POST /api/identity/resolve` handler. Upon authentication check, if no corresponding `User` or `Person` record exists, the server executes a transaction creating a `User` and linking it to a newly created `Person` record.
4.  **Multi-Context Discovery Endpoint**: Expose an auth-guarded `/api/identity/context-discovery` gateway. Rather than assuming a workspace context, clients query this endpoint to retrieve workspaces, pending invitations, platform roles, active assignments, and resource approvals linked to the authenticated Person.
5.  **Verified Claims & Token Security**: 
    *   Workspace invitations are discovered strictly when email/phone claims are verified in the ID token (e.g. `email_verified: true`). Unverified registration emails must not expose invitation details.
    *   No raw bearer invitation tokens are stored directly in the database. A SHA-256 hash of the token is saved, while the raw token is passed strictly in the invitation link.
6.  **Canonical Assignment Traversal Path**: Context discovery resolves direct assignments by traversing:
    $$\text{Person} \longrightarrow \text{Crew Resource} \longrightarrow \text{Assignment}$$
    *(Lookup resources where `humanConfig.personId == personId`, and then lookup assignments matching those `resourceId` values).*

## Consequences
*   **Decoupled Onboarding**: Users sign up easily without selecting roles. Capability profiles and access emerge later.
*   **Robust Multi-Tenancy**: Mobile apps can sign a user in, query their context list, and allow them to switch seamlessly between operating roles (e.g. captain on one vessel, owner on another).
*   **Security Alignment**: No client-controlled identity spoofing is possible, as the identity link is resolved strictly in server memory from the decrypted JWT payload.
