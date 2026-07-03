---
type: Concept
title: "Workspace"
description: "The primary operating environment where an operator, team, organization, or partnership configures and manages their presence on the platform."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Workspace

A **Workspace** is the primary operating environment on the Tuamotu Platform. It is an application-level concept that scopes administration, collaboration, branding, websites, operational workflows, and configuration.

## Architectural Principles

*   **Context over Ownership**: A Workspace represents an operating context, not a business ownership boundary. Core platform entities (People, Organizations, Resources, Bookings, Settlements) are globally addressable and exist independently of any individual Workspace.
*   **Decoupled Participation**: Entities participate in a Workspace through explicit relationships (e.g. approved resources, active partnerships, guest memberships) rather than direct data ownership.
*   **Multi-Workspace Operations**: A single entity (such as a captain, vessel resource, or concierge partner) can participate in multiple Workspaces simultaneously without redefining its platform identity.

## Properties & Naming Rules
*   Represented in the code as a `WorkspaceDocument` in the `workspaces` collection.
*   Uniquely identified by a workspace prefix and UUID (e.g. `id: "ws_uuid"`).
*   Tracks configuration configurations (branding details, custom domains, notification bounds).

## Workspace Module System

A **Workspace Module** is a scoped collaboration engine that implements a specific dynamic capability (e.g., chat messaging, calendar scheduling, voting polls, financial budgeting) within a Workspace environment.

### Relationship to Participant Perspectives
Modules are not hard-coded features of a workspace. Instead, their visibility and state are determined dynamically per participant via the `ContextResolutionEngine`:
*   **Visible Modules**: The engine returns a list of visible modules (`visibleModules`) tailored to the user's role and the workspace's configuration.
*   **Module State**: Each visible module is resolved with a specific lifecycle state (`active`, `read-only`, `locked`, `closed`). For example, a chat module is marked `read-only` if a workspace is archived, locking out new input controls in the UI.

### The Module Registry Pattern
To maintain technology-independence and client extensibility, the presentation of modules is decoupled from client implementations using a **Module Registry** pattern:
*   The `ResolvedContextPackage` delivers the identifiers and lifecycle states of the modules.
*   Client applications map these module definitions to local visual components using a registry lookup, ensuring that new modules can be added to the platform without modifications to the page layout shells.

### Permissions & Allowed Actions
Capabilities within a module are gated by the context's `allowedActions`. For example, while a traveler might see the chat module in the portal, they can only send messages if `sendMessage` is present in their `allowedActions` list. Administrative actions (like adding a poll or archiving) are hidden dynamically based on this authorization mapping.

### Persistence & Boundaries
*   **Module Configuration**: Module configurations are declared at the workspace level (e.g., enabling AI agent features or setting public/private visibility).
*   **Operational State**: Message threads, poll records, and calendar events are persisted as decoupled sub-collections or independent documents in Firestore, using the `workspaceId` as a routing key. They do not pollute the core Platform Kernel.

### Dependency on Bound Entities
Modules often contextualize core platform entities. For instance, a calendar module displays the scheduled itineraries associated with bound `Booking` and `Resource` entities, bridging the collaboration layer and the business truth registry.

## Examples

### Good Practice
*   Adding a vessel to a Workspace via relationship mapping:
    ```typescript
    interface WorkspaceResourceRelationship {
      workspaceId: string;
      resourceId: string;
      status: 'active' | 'suspended';
      contractDetails?: string;
    }
    ```
*   Configuring custom branding parameters unique to the Workspace view while leaving the underlying experiences globally accessible.

### Bad Practice
*   Never make a core entity (such as a Vessel or Person) a nested sub-document of a Workspace. Doing so restricts its ability to participate in other workspaces or marketplaces.
