---
type: Concept
title: "Adventure"
description: "A defined excursion package or itinerary (e.g. sunset cruise) specifying default pricing and routes."
owner: "Marketing"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Adventure

An **Adventure** represents a standard trip template. 

## Key Properties
*   Has predefined durations (e.g. 4 hours, 8 hours).
*   Holds baseline pricing schemas, tax rates, and deposit thresholds.
*   Maps to a specific start/end relocation port (defaulting to the vessel's home location).

## Examples

### Good Practice
*   Store excursions like "Destin Harbor Sunset Cruise" as an Adventure document.
*   Define adventure properties: `durationHours: 4` and `basePrice: 1200`.

### Bad Practice
*   Never use an Adventure to record a single booking occurrence on the calendar (use **Booking**).

