---
type: Architecture
title: "Tuamotu Platform Architecture v1.0"
description: "Authoritative architectural definition of the Tuamotu Platform: Kernel, Workspace, Context Resolution Engine, Clients, and Modules."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Tuamotu Platform Architecture v1.0

This document defines the core architecture of the Tuamotu Platform. It serves as the primary orientation and reference for developers, architects, contributors, and AI agents.

---

## 1. Architectural Philosophy

The Tuamotu Platform is built on a simple, governing principle: **Truth precedes collaboration, and context defines experience.** The platform is structured into clean layers, each with a strict, immutable responsibility:

*   **Knowledge precedes implementation**: Coding follows established conceptual mapping.
*   **The Platform Kernel models truth**: The kernel captures immutability and business reality.
*   **Workspace models collaboration**: Workspaces organize interactions and contextualize kernel truth without owning it.
*   **Context Resolution models participant experience**: User views are resolved dynamically rather than determined by the client.
*   **Clients render context**: Client-side interfaces are thin, presentational shells that do not compute business or authorization rules.
*   **Modules compose capabilities**: Dynamic, reusable capabilities are registered and activated through resolved context.

---

## 2. Structural Layers

### 2.1 The Platform Kernel
The **Platform Kernel** is the system of record. It models authoritative business truth across four core domains:
*   **Identity**: People (`Person`) and Organizations (`Organization`).
*   **Commercial**: Listings (`Listing`) and Commercial Offers (`Offer`).
*   **Operational**: Vessel assets (`Vessel`) and booking schedules (`Booking`).
*   **Financial**: Ledgers, transaction records, and split payment agreements (`Settlement`).

Kernel entities are globally addressable and exist independently of any user experience, client channel, or workspace. They remain technology-agnostic and contain zero presentation logic.

### 2.2 The Workspace
The **Workspace** is the primary boundary for collaboration. It coordinates participants, governance settings, bound kernel entities, and collaboration modules around a shared purpose (e.g. charter trip planning, partner cooperation, broker deals).
*   **Collaboration coordinates truth, it never owns it**: Workspaces do not own core kernel entities (like Vessels or Guests); they establish relationships (bindings) to contextualize how those entities participate in the collaboration.
*   **Multi-Workspace Participation**: A vessel or guest can participate in multiple workspaces concurrently without duplicating their underlying platform identity.

### 2.3 Context Resolution Runtime
The **Context Resolution Engine** (`ContextResolutionEngine`) is the authoritative runtime component that compiles user experiences. It is:
*   **Deterministic**: Produces the exact same perspective package given the same database state.
*   **Side-Effect Free**: Behaves as a pure read-only function, executing zero database writes, dispatching no external events, and triggering no side-effects.
*   **Technology & Channel Agnostic**: Operates independently of Next.js, React, or mobile platforms, returning a structured `ResolvedContextPackage` contract consumed by web, mobile, REST, or AI agent interfaces.

### 2.4 Workspace Clients
**Workspace Clients** are thin presentational layers that consume the `ResolvedContextPackage`.
*   Clients **never** query databases directly or run calculations to decide what buttons, forms, or navigation items appear.
*   Clients render UI elements solely by parsing the compiled `perspective.allowedActions` and `perspective.visibleModules` arrays.
*   Operator, Participant, Broker, and AI clients use the exact same workspace client library, changing only the back-navigation links and local styles.

### 2.5 Workspace Modules
**Workspace Modules** provide reusable collaboration capabilities (such as Chat messaging, Calendar itinerary trackers, Voting polls, and Budget ledgers).
*   **Dynamic Registration**: Managed via a decoupled, central registry mapping module IDs to presentation components.
*   **Decoupled Presentations**: Modules are client-agnostic and render in active or read-only states depending on the resolved lifecycle flag.
*   **Clean Boundaries**: Module persistence (like message threads or poll selections) is stored under dedicated workspace-scoped collections, ensuring they never pollute the core business truth of the Platform Kernel.

---

## 3. Server/Client SDK Boundaries
To prevent server credentials leaking into client bundles, the code enforces a strict import separation:
*   **Server-Side Admin Database**: All server operations and API handlers must use the Server SDK (`firebase-admin`) initialized through `@/lib/adminDb.ts`. Private keys are loaded from secure environment variables.
*   **Client-Side Database**: The client interface accesses read-only content directly through client SDK configurations or Next.js route API wrappers. Client code must never import from `firebase-admin` or `@/lib/adminDb`.
*   **Secret Key Isolation**: No private keys (Stripe secret keys, Telnyx keys, Resend credentials, Meta Page tokens) can be imported or used in files marked with `'use client'`.
