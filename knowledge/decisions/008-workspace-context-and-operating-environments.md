---
type: ADR
title: "ADR-008: Workspace Context and Operating Environments"
description: "Defining the application boundaries and decoupling model of Workspaces from core platform business logic."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-008: Workspace Context and Operating Environments

## Status
Accepted

## Context
As the platform expands to support multiple operators, charter brokers, concierge desks, and independent vessel owners, we need an operating environment (Workspace) to manage custom websites, billing configurations, and dashboard lists. If we design Workspace as a physical owner of core entities (Vessels, Bookings, Guests, Settlements), we prevent those entities from participating in cross-workspace operations (such as a captain working for multiple operators, or a vessel being booked across multiple broker platforms).

## Decision
We establish **Workspace** as an application-level context wrapper rather than a database containment/ownership layer:

1.  **Decoupled Containment**: Core platform entities (People, Organizations, Resources, Experiences, Bookings, Settlements) are globally addressable and exist independently of any individual Workspace. A Workspace establishes **context**, not ownership.
2.  **Explicit Relationship Mapping**: Instead of nesting core entities inside a workspace document, participation is managed via explicit relationship records (e.g. `/workspace_resources`, `/workspace_memberships`).
3.  **Cross-Workspace Scheduling & Settlements**: A resource (vessel/crew) can be allocated to itinerary calendars by different workspaces, and a single settlement can distribute payout shares across partners participating in multiple workspace networks.

## Consequences
*   **Asset Sharing**: A vessel owner can list their yacht in multiple workspaces (e.g., direct operator workspace + white-label broker workspace) without duplicating the underlying resource schema.
*   **Security & RBAC**: User authorization check runs at both the Workspace level (managing context operations) and the Platform Role level (governing data access rules).
*   **Marketplace Readiness**: The platform is inherently ready to support marketplace models where partners, captain networks, and vessel resources can be discovered and invited to participate in workspaces dynamically.
