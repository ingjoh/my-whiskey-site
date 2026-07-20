---
type: ADR
title: "ADR-011: Generalized Context Resolution and Native UI Architecture"
description: "Establishing a single, generalized endpoint /api/context/resolve for diverse context runtimes and defining declarative, token-driven visual principles for native clients."
owner: "Domain"
status: "Approved"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR 011: Generalized Context Resolution and Native UI Architecture

## Status
Approved

## Context
The initial mobile PoC requirements (Phase B) specified workspace-centric routes (e.g. `/api/workspaces/{workspaceId}/context`). However, the Tuamotu platform will support diverse presentation surfaces (native mobile, concierge web console, public APIs, headless IoT sensors) and multiple operating context boundaries (workspaces, assignments, and traveler voyages). 

Furthermore, to maintain long-term scalability and style consistency across different client runtimes, we require a decoupled, token-based visual architecture for client applications.

## Decision
1.  **Generalized Context Resolution Endpoint**: Replaced workspace-centric API targets with a single, decoupled POST endpoint `/api/context/resolve` taking a type-safe `context` selector object.
2.  **Removal of Identity Claim Transmission**: The client must **never** send `actorId` or user identifiers in request bodies. The server-side context resolver relies solely on the verified Firebase ID Token headers to load user mappings.
3.  **Token-Driven UI Primitives**: Native clients will construct views using type-safe design tokens (via `@shopify/restyle` or equivalent frameworks) mapping to semantic visual states (Loading, Loaded, Empty, Error, Offline, Access Denied), ensuring screens are thin declarative shells driven entirely by the server-returned `ResolvedContextPackage`.

## Consequences
*   Allows the platform to scale to future context shapes (such as `traveler_trip` or `iot_device`) without client-side modifications.
*   Enforces secure server-side user resolution, preventing client identity spoofing.
*   Enforces consistent look-and-feel across all mobile screens without layout duplications.
