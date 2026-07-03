---
type: Concept
title: "Payout"
description: "The financial record tracking fund transfers and cash outflows to captains, crew, vessel owners, and partners."
owner: "Finance"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Payout

A **Payout** records a financial transfer or cash outflow from the platform's central funds to a specific recipient (Person, Organization, or Resource) based on posted settlements.

## Properties & Naming Rules
*   Represented in the code as a `PayoutDocument` in the `payouts` collection.
*   Uniquely identified by a payout prefix and UUID (e.g. `id: "po_uuid"`).
*   Tracks recipient coordinates via `recipientType` and `recipientId`.
*   Maintains transfer statuses (`draft`, `approved`, `processing`, `paid`, `failed`).

## Examples

### Good Practice
*   Paying out a captain resource: `recipientType: 'resource'`, `recipientId: 'res_crew_sarah'`.
*   Linking the payout to its originating settlement: `settlementId: 'set_booking_789'`.

### Bad Practice
*   Never process payouts or release funds to Stripe Connected Accounts without verifying that the source `Settlement` totals have been fully collected.
