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
