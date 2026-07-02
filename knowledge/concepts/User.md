---
type: Concept
title: "User"
description: "The system-authenticated actor mapping to a physical Person."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# User

A **User** is an authenticated system account that maps 1-to-1 to a physical **Person**.

## Details
*   Represents authentication records (e.g., Firebase Authentication `uid`, login histories, active sessions, custom auth claims).
*   Always holds a reference (`personId`) pointing back to their physical identity in the `/people` collection.
*   Enables system interaction (e.g., logging into dashboards, editing content, viewing invoices).

## Examples

### Good Practice
*   Store the login activity history and Firebase authentication metadata under the `User` schema.
*   Resolve user authorization at the API layer by reading the active scoped roles associated with the user's `personId`.

### Bad Practice
*   Do not store crew resumes, guest preferences, or shipping addresses on the `User` document; store them on the `Person` or corresponding capability records.
