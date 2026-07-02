---
type: Concept
title: "Permission"
description: "The atomic access flag representing the ability to execute a specific API operation or read/write a resource."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Permission

A **Permission** is an atomic access flag representing the authorization to execute a specific API operation or read/write a resource (e.g., `read:bookings`, `write:assets`, `delete:blackout`).

## Details
*   Permissions are represented in code as string identifiers.
*   They are linked to **Roles** to build access control structures.
*   Decoupled from Person identity to ensure authorization maps to tenant boundaries rather than direct user records.

## Examples

### Good Practice
*   Protect API endpoints by validating the presence of a specific permission string (e.g., `write:assets`) on the decoded session claim.
*   Group permissions under roles like `admin` or `staff` to simplify assignment.

### Bad Practice
*   Do not assign permissions directly to a `Person` document; assign them to `Roles`, and assign those roles to a person via `Role Assignments`.
