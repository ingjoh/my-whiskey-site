---
type: Concept
title: "ItineraryTemplate"
description: "A reusable route, duration, and stop template defined under an Experience."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Itinerary Template

An **Itinerary Template** represents a reusable route, stop list, and duration template defined under an **Experience**.

## Details
*   Defines the operational layout of an excursion (e.g. "Cruising Choctawhatchee Bay, stopping at Crab Island for 2 hours, returning via East Pass").
*   Multiple Itinerary Templates can belong to a single parent Experience, providing customers with duration and route choices for the same overall product.
*   Serves as the template from which specific `Operational Itineraries` are spawned during checkout.

## Examples

### Good Practice
*   Create a "Sunset Cruise" Experience and define a "Harbor Route Template" and a "Bay Route Template" to handle different wind conditions.
*   Specify default transit and stop durations within the template to aid scheduler automation.

### Bad Practice
*   Do not record the actual passenger manifest or specific captain assignments in the template; these belong to the `Operational Itinerary` and `Assignment` entities.
