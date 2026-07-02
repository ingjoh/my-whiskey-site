---
type: Concept
title: "OperationalItinerary"
description: "The execution-time plan of routes, stops, and dynamic resource allocations for a confirmed booking."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# OperationalItinerary

An **OperationalItinerary** is the live, execution-time plan of route stops, scheduled times, and resource allocations for delivering a charter experience. It is distinct from the static commercial itinerary template.

## Properties & Naming Rules
*   Represented in the code as an `OperationalItineraryDocument` document.
*   Uniquely identified by an itinerary prefix and UUID (e.g. `id: "opit_uuid"`).
*   Links back to a single **Booking** via `bookingId`.
*   Maintains lists of physical stops (target arrival, target departure, actual timestamps) and references vessel allocations.

## Examples

### Good Practice
*   Retrieving stops for an active charter: `itinerary.stops.map(s => s.name)`.
*   Updating a stop status when the vessel arrives physically at the location.

### Bad Practice
*   Do not overwrite or confuse the operational itinerary with the commercial `ItineraryTemplate` snapshot.
