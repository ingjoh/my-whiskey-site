---
type: Concept
title: "Gear"
description: "Non-vessel add-on assets (e.g. water toys, snorkeling gear) available for rent."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Gear

**Gear** represents secondary rental assets. These are items that guests can add to a booking to enrich their yacht experience.

## Properties & Naming Rules
*   Represented in the code as an `Asset` entity where `isVessel` is `false`.
*   Includes items like paddleboards, jet skis, snorkeling equipment, and specialized fishing gear.
*   Pricing can be flat-rate per trip or hourly.

## Examples

### Good Practice
*   Create water toys as Gear assets linked to bookings.
*   Filter non-vessels with `assetsList.filter(a => !a.isVessel)` to load gear lists.

### Bad Practice
*   Never set `isVessel: true` on an item representing water toys or accessories.

