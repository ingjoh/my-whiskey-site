---
type: Concept
title: "Person"
description: "The physical real-world identity of a human (encompassing crew, staff, captains, guests, and brokers)."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Person

A **Person** represents the decoupled real-world physical identity of any human interacting with the platform.

## Details
*   Encompasses everyone: guests, passengers, captains, chefs, crew, operations staff, and external brokers.
*   Contains core contact details (name, email, phone, physical address).
*   Does not contain credentials, authentication states, or system access records (which belong to the **User**).
*   Does not contain professional qualifications (which belong to **Capabilities**).
*   Does not contain authorization mappings (which are handled via **Role Assignments**).

## Examples

### Good Practice
*   Create a single `Person` record for a guest checking out. If they later become a broker or join as crew, link those new capability or role records back to this same `Person` ID.
*   Reference `Person` IDs in booking passenger manifests or crew assignments.

### Bad Practice
*   Do not store username or password hashes on the `Person` document; store them on the `User` or handle them via authentication claims.
