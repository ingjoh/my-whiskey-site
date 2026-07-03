---
type: Architecture
title: "Workspace Runtime Architecture"
description: "Platform runtime flow, context resolution patterns, and interaction layer separation."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Workspace Runtime Architecture

This document defines the runtime interaction model of the Tuamotu Workspace Collaboration layer, focusing on how participant-specific operating contexts are resolved.

---

## 1. Runtime Architecture Flow

The workspace collaboration architecture decouples authoritative truth (Platform Kernel) from interaction contexts (Participant Perspectives). The **Context Resolution Engine** acts as the single gateway that maps raw platform concepts into secure, channel-specific packages:

```mermaid
graph TD
    subgraph "Client / Interaction Layer"
        Client["Client Applications: Web, Mobile, AI Agents, APIs"]
    end

    subgraph "Workspace Runtime Layer"
        CRE["Context Resolution Engine"]
        PP["Participant Perspective"]
        AllowedActions["Allowed Actions"]
        VisibleModules["Visible Modules"]
    end

    subgraph "Context / Governance Layer"
        WS["Workspace Document"]
        WSM["Workspace Memberships"]
        WSB["Workspace Bindings"]
    end

    subgraph "Platform Kernel (Authoritative Truth)"
        PK["Platform Kernel: Bookings, Resources, People, Organizations"]
    end

    Client -->|1. RequestContext: actorId, workspaceId| CRE
    CRE -->|2. Query status & governance| WS
    CRE -->|3. Verify active role| WSM
    CRE -->|4. Resolve visibility config| WSB
    WSB -->|5. Match references| PK
    CRE -->|6. Assemble ResolvedContextPackage| PP
    PP -->|Allowed Actions| AllowedActions
    PP -->|Visible Modules| VisibleModules
    Client -->|7. Render dynamically based on| PP
```

---

## 2. Component Roles

1.  **Platform Kernel (Truth)**: Authoritative business models. It has no awareness of workspaces, collaboration states, or participant permissions.
2.  **Context / Governance Layer**: Defines the collaboration boundaries. It stores administrative metadata, member roles (`/workspace_memberships`), and references linking workspaces to kernel concepts (`/workspace_bindings`).
3.  **Context Resolution Engine**: A side-effect free compiler that merges governance policies and member permissions to produce a dynamic perspective.
4.  **Participant Perspective**: A context contract mapping exactly what modules are visible and what operations are permitted for the participant.
5.  **Client Applications**: Consumers of the Resolved Context Package. They do not calculate security boundaries; they only present the interface matching the allowed actions.
