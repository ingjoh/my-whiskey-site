---
type: Concept
title: "Role"
description: "The reusable definition of a set of permissions mapping to organizational responsibilities."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Role

A **Role** defines a static set of permissions mapping to organizational responsibilities.

## Details
*   Roles represent structural administrative classifications (e.g. `owner`, `admin`, `dispatcher`, `scheduler`, `broker`, `guest`).
*   Does not store user identifiers directly.
*   Maps to a set of permission strings (referencing static reusable permission keys like `read:bookings` or `write:assets`).
*   Used by the system to authorize API calls and route clients.

## Examples

### Good Practice
*   Define role structures globally in a central static configuration mapping (e.g. the `roles` collection in Firestore).
*   Add a new permission `publish:blog` to the `admin` Role record, instantly propagating access to all users assigned the admin role.

### Bad Practice
*   Do not combine physical skill capabilities (like holding a Yacht Captain License) with organizational Roles. Keep Roles and Capabilities separate.
