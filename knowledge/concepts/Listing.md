---
type: Concept
title: "Listing"
description: "The commercial representation of an Experience sold by a specific tenant Organization."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Listing

A **Listing** is the commercial merchandising wrapper that relates a reusable **Experience** to a specific tenant **Organization** (e.g. M/Y Whiskey listing the Crab Island Sandbar charter at $800 base rate).

## Details
*   Defines merchant-specific pricing parameters (base charter rates, passenger surcharges, sales taxes, deposit policies).
*   Enforces scheduling constraints (lead times, check-in thresholds) and allowed resource criteria (such as allowed vessel categories).
*   Serves as the commercial catalogue from which individual `Offers` are dynamically compiled and priced.

## Examples

### Good Practice
*   Create a Listing for "Sunset Yacht Charter" under Organization "M/Y Whiskey" establishing a test-mode base cost of $1000.
*   Update a Listing's status to `inactive` to temporarily suspend bookings without deleting the underlying Experience definition.

### Bad Practice
*   Do not store transaction-level receipts or checkout dates inside the Listing; these are snapped into the `Offer` and locked in the `Booking`.
