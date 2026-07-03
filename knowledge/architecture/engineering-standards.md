---
type: Architecture
title: "Engineering Standards"
description: "Implementation conventions, repository patterns, testing bootstraps, and naming prefixes."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Engineering Standards

This document establishes the code-level implementation standards and conventions for the Tuamotu Platform, ensuring consistency across all repository services and developer agent operations.

---

## 1. Repository Layer Standards
*   **Firestore Separation**: Direct Firestore database queries and mutations must reside in dedicated Repository classes (e.g. `WorkspaceRepository`) under `src/lib/db/`. Business logic or orchestration checks must not exist in this layer.
*   **Undefined Property Sanitization**: Firestore does not accept undefined properties. Repository inputs must conditionally strip undefined fields or replace them with defaults/nulls before writing payloads.
*   **Index-Safe Query Design**: To prevent Firebase missing index exceptions, avoid composite queries (e.g., sorting by timestamp after filtering by reference ID) unless the index is pre-provisioned. Perform simple index filtering at the DB level, and execute sorting/grouping client-side in the repository code.

---

## 2. Service Layer Standards
*   **Intent-Based APIs**: Service controllers must expose explicit domain action methods (e.g. `inviteMember()`, `bindEntity()`) instead of generic CRUD operations.
*   **Dynamic Registry Validation**: When checking concept validity, services must parse the central platform registry `knowledge/index.yaml` dynamically rather than maintaining duplicate hardcoded type lists in code.
*   **Domain Event Logger**: Mutations must log domain events (e.g. `MemberInvited`) in append-only structures, preserving a full history of transaction lifecycles.

---

## 3. Testing Standards
*   **Test Environment Initialization**: Standing scripts or tests that rely on Firebase Admin SDK must load `.env.local` environment parameters at the absolute top of the execution thread, prior to importing any firebase or database services.
*   **Permanent Directories**: Do not keep active verification tests in scratch directories. All test cases must reside under `src/test/` and run via standard npm scripts (e.g., bundling TS on-the-fly using `esbuild`).

---

## 4. Naming & Identifier Prefixes
All core databases and identifiers must follow standardized prefixes:
*   **Workspaces**: `ws_`
*   **Memberships**: `wsm_`
*   **Bindings**: `wsb_`
*   **Audit Events**: `wsa_`
