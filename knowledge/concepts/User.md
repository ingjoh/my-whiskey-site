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

A **User** is a system access account that maps 1-to-1 to a physical **Person**.

## Details
*   Represents authentication mappings (e.g., maps system identities to the Firebase Authentication `uid`).
*   Always holds a reference (`personId`) pointing back to the physical identity in the `/people` collection.
*   Enables system interaction and account state management (e.g., active, suspended, preferences).
*   Does **not** store credentials, passwords, or active JWT session tokens, which are owned and managed entirely by the external authentication provider (Firebase Auth).

## Security & Authentication Boundaries
*   All token verification occurs server-side. The server decodes the token, retrieves the external provider `uid`, maps it to the `User` record, and resolves the linked `personId`.
*   Client applications must never supply their own user or person IDs in critical API requests.

## Examples

### Good Practice
*   Store the user's interface preferences (locale, theme) and account status under the `User` schema.
*   Resolve authorization server-side by loading the active workspace memberships or role assignments associated with the user's resolved `personId`.

### Bad Practice
*   Do not store active JWT tokens or authentication passwords on the `User` document.
*   Do not store crew resumes, guest preferences, or shipping addresses on the `User` document; store them on the `Person` record.
