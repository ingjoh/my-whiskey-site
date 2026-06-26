---
type: Concept
title: "Blackout"
description: "A scheduled duration where a Vessel or Gear is unavailable for guest bookings due to maintenance or owner utilization."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Blackout

A **Blackout** represents a calendar block.

## Details
*   Ensures that slot booking checkers do not display the asset as available.
*   Assigned a specific title (e.g. "Annual Hull Polish", "Owner Holiday").
*   Can be single-day or multi-day blocks.

## Examples

### Good Practice
*   Create a Blackout document for a vessel when scheduled for dry dock maintenance.
*   Query active blackout ranges when displaying search availability to guests.

### Bad Practice
*   Never represent a Guest reservation as a Blackout (use **Booking** with status `confirmed`).

