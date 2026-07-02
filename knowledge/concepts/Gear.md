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
*   Represented in the code as a `ResourceDocument` entity where `type` is `'gear'`.
*   Includes items like paddleboards, jet skis, snorkeling equipment, and specialized fishing gear.
*   Allocated dynamically on itineraries and tracked for availability via the inventory allocations capacity ledger.

## Examples

### Good Practice
*   Create water toys as Gear resources linked to bookings.
*   Filter non-vessels with `resources.filter(r => r.type === 'gear')` to load gear lists.

### Bad Practice
*   Never set `type: 'vessel'` on an item representing water toys or accessories.

