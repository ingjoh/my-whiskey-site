---
type: Concept
title: "RoleAssignment"
description: "The linkage record mapping a specific Person to a specific Role within a specific Organization, Partnership, or Platform scope."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Role Assignment

A **Role Assignment** is the linkage record mapping a specific **Person** to a specific **Role** within a defined scope (e.g., `scopeType: 'organization' | 'partnership' | 'platform'`).

## Details
*   Enables multi-tenancy and multiple concurrent roles: a person can be an `owner` in Organization A and a `guest` in Organization B.
*   Enables role expiration or temporary delegation.
*   Contains the `scopeId` representing the target Organization ID, Partnership ID, or "platform".

## Examples

### Good Practice
*   Assign a newly hired captain the `staff` role assignment scoped to the organization `org-whiskey`.
*   Filter authorization checks at the API boundary by reading the active scoped role assignments of the requesting user.

### Bad Practice
*   Do not hardcode role assignments inside code or claims databases; store them as documents in `/role_assignments` to allow dynamic revocation.
