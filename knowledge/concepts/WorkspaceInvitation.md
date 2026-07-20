---
type: Concept
title: "Workspace Invitation"
description: "A separate, pending request inviting a user to join a Workspace."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Workspace Invitation

A **Workspace Invitation** represents a pending offer to join a Workspace.

## Details
*   Exists separately from **Workspace Membership**.
*   A Workspace Invitation may reference an email or phone number placeholder because the target `Person` record may not exist yet.
*   Once verified and accepted, a `WorkspaceMembership` is created referencing the established `personId`, and the invitation status transitions to `accepted`.
*   **Security Controls**: Raw invitation tokens must **never** be stored directly in the database. Instead, store a one-way cryptographically secure token hash, expiration timestamp, consumed timestamp, and revocation status. The raw token exists strictly in the invitation link.
*   **Discovery Guard**: Pending invitations must **only** be discovered during context discovery if the user's email or phone number claims in their authenticated ID token are verified (e.g. `email_verified: true`). Unverified registration emails must not be sufficient to expose invitation details.

## Examples

### Good Practice
*   Create a `WorkspaceInvitation` document with a hashed representation of the token, and email the raw link containing the token to the prospective member.
*   Check the authenticated ID token claims to verify the email belongs to a verified address before returning the invitation in context discovery.

### Bad Practice
*   Do not store the plaintext token in the database.
*   Do not automatically add the user as a `WorkspaceMembership` before they explicitly accept the invitation.

