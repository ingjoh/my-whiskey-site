---
type: Concept
title: "Booking"
description: "A confirmed transactional record locking the commercial contract, spawned by accepting a single Offer."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Booking

A **Booking** represents the single record of truth for a customer's confirmed commercial transaction.

## Details
*   Spawned by accepting exactly one **Offer** from a Proposal.
*   Binds the customer and operator to the commercial contract terms snapshotted inside the accepted Offer.
*   Does not own the scheduled date, pricing, or resource preferences directly; it references the immutable accepted **Offer** for all commercial metrics.
*   Spawns the operational execution pipeline (**Operational Itinerary** and **Assignments**).
*   Tracks payment status, waiver completions, and client messaging.

## Examples

### Good Practice
*   Link a Booking document to an accepted `Offer` ID (`acceptedOfferId`) and a `Person` ID (`guestId`).
*   Verify logical tenant boundaries on bookings by filtering records matching `tenantId` (representing the Organization tenant).

### Bad Practice
*   Never use a Booking entity to represent a pending or unpaid quote (use **Proposal**).
*   Do not edit the pricing parameters directly on a Booking; handle financial differences via settlement adjustments.
