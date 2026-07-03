---
type: Concept
title: "WorkspaceTemplate"
description: "Represents the version-controlled bootstrap template defining default modules, governance, brand layouts, and configurations for provisioning new workspaces."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# WorkspaceTemplate

A **WorkspaceTemplate** represents the predefined blueprint used to instantiate new workspaces. It guarantees consistency across different workspace onboarding paths (e.g. business operating centers, public marketplaces, or personal/traveler environments) by standardizing initial configurations instead of hardcoding setup scripts in application logic.

## Properties & Naming Rules

*   **Identified**: Prefixed with `wt_` followed by an architectural category (e.g. `wt_business`, `wt_collaboration`, `wt_marketplace`, `wt_personal`, `wt_blank`).
*   **templateVersion**: Integer version tracker (e.g. `1`), allowing templates to evolve over time without modifying already provisioned active workspaces.
*   **defaultModules**: List of initial collaboration module IDs to enable (e.g., `['chat', 'calendar']`).
*   **governanceDefaults**: Default security settings (e.g., `privacy: 'private'`, `allowAiAgents: false`).
*   **brandDefaults**: Initial HSL color tokens and basic typography selections.
*   **websiteDefaults**: Navigation layout types and default page-routing configurations.

## Platform Capabilities

Workspace templates can bundle default capabilities that compose multiple collaboration modules. For example, activating the `Financial Collaboration` capability may bootstrap both the `budget` module and split-settlement bindings.

## Examples

### Good Practice
*   Naming templates based on their collaboration patterns rather than business titles:
    *   Use `wt_business` or `wt_collaboration` rather than `wt_operator` or `wt_broker`.
*   Incrementing `templateVersion` when introducing new default modules for future workspaces while preserving legacy setups.

### Bad Practice
*   Never couple a template definition directly to a single operator's business identity. Templates define starting configurations, not business data.
