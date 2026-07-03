---
type: ADR
title: "ADR-009: Context Resolution Runtime"
description: "Centralizing workspace authorization, module visibility, and binding resolution into a deterministic, side-effect free runtime engine."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-009: Context Resolution Runtime

## Status
Approved

## Context
As the Tuamotu platform expands, multiple interaction channels (web consoles, mobile applications, REST APIs, and autonomous AI agents) need to access workspaces. Historically, authorization and UI state calculation (like checking which modules are active or which links are visible) are calculated ad-hoc by the client interfaces. This scatters security rules and leads to duplication or gaps.

We need a centralized runtime component to compile a participant's workspace view securely.

## Decision
We establish the **Context Resolution Engine** (`ContextResolutionEngine`) as the single authoritative, technology-agnostic component for calculating operating perspectives.

The runtime complies with these architectural decisions:
1.  **Deterministic & Side-Effect Free**: The engine operates as a pure context compiler. Given a `RequestContext` input, it queries database states to return the output, but performs zero writes, logs no operational database mutations, dispatches no events, and starts no external workflows.
2.  **Canonical Contract**: The engine returns the `ResolvedContextPackage` as the authoritative contract. All future client applications must consume this package to determine their capabilities.
3.  **Centralized Allowed Actions**: Client applications must not calculate permissions dynamically. Instead, the engine compiles a list of explicit permissions (`allowedActions: ['inviteMembers', 'bindEntity']`) in the response, which the client uses to toggle visual elements.
4.  **Audit Impersonation**: Admin impersonations using `impersonatorId` must verify role assignment permissions in the database before resolving the context. Impersonation tags must serve as metadata only and never implicitly grant permissions.

## Consequences
*   **Decoupled Client Interfaces**: UI clients become thin rendering engines that map the context package onto presentational components.
*   **Centralized Governance**: Modifying collaboration visibility rules or permissions is done in one place in the engine.
*   **Performance Overhead**: Resolving all bindings and memberships in one engine call can add latency if there are hundreds of bound entities. The engine must query these relations using batch retrieval features.
