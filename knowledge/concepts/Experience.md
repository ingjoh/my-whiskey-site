---
type: Concept
title: "Experience"
description: "The reusable product definition outlining what can be enjoyed on a charter."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Experience

An **Experience** is the reusable product definition outlining what can be enjoyed on a yacht charter (e.g. "Sunset Cruise", "Crab Island Snorkeling Trip"). 

## Details
*   Defines what the excursion is, independent of when it occurs, who participates, or which resources (vessels or crew members) fulfill it.
*   **An Experience may define one or more Itinerary Templates**, representing the different possible routes, durations, or operational variations for delivering that same Experience.
*   Acts as the product catalog from which commercial `Listings` are created by tenants.

## Examples

### Good Practice
*   Create a single "Crab Island Sandbar Charter" Experience, and define both a "3-Hour Express" template and a "6-Hour Full-Day" template under it.
*   Store customer gallery images and general promotional descriptions in the Experience document.

### Bad Practice
*   Do not hardcode pricing or specific calendar dates directly in the Experience; pricing rules are governed by the `Listing` and scheduling by the `Offer`.
