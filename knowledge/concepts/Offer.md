---
type: Concept
title: "Offer"
description: "The smallest commercially bookable commitment the platform can sell."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Offer

An **Offer** is the smallest commercially bookable commitment the platform can sell.

## Details
*   Encapsulates a specific commercially valid combination of an Experience, Itinerary Template, pricing configurations, scheduling assumptions, and commercial policies.
*   A Proposal may contain one or more Offers representing available options.
*   **Immutability Principle**: A Booking is created by accepting exactly one Offer. Once accepted, the Offer document becomes **immutable** representing the frozen commercial agreement. All subsequent operational updates (crew changes, route swaps, weather delays) flow through the Booking or Operational Itinerary, preserving the historical commercial record.
*   Snapshots all pricing configuration fields (base rate, extra guest rate, tax rate, cancellation policy) from the active `Listing` at creation to isolate it from future Listing changes.

## Examples

### Good Practice
*   Create an Offer for Friday sunset on vessel category 'yacht' for $1200. If the customer completes checkout, lock this document by setting `isAccepted: true`.
*   Invalidate companion options in the parent Proposal by changing their status to `expired` once the target Offer is accepted.

### Bad Practice
*   Never modify the pricing fields of an accepted Offer if a crew member is substituted; record the crew change on the Operational Itinerary and settle the cost difference on the Settlement layer.
