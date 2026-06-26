---
type: Concept
title: "Vessel"
description: "A luxury boat/yacht asset available for charter excursions."
owner: "Operations"
status: "Authoritative"
maturity: "core"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Vessel

A **Vessel** is the primary high-value asset in the booking engine. It maps to physical boats managed by the platform.

## Properties & Naming Rules
*   Represented in the code as an `Asset` entity where `isVessel` is `true`.
*   Uniquely identified by a lowercase hyphenated slug (e.g. `vesselSlug: "whiskey"`).
*   Contains attributes for home location, relocation speed, passenger capacity, and amenity tags.

## Naming Warning
*   Never use the term "Asset" in frontend guest layouts. Always display as "Vessel" or "Yacht".
*   "Asset" is only used as a backend base interface class merging Vessel and Gear.

## Examples

### Good Practice
*   Use `vesselSlug: "whiskey-yacht"` to identify a boat document.
*   Filter assets with `assetsList.filter(a => a.isVessel)` to gather fleet lists.

### Bad Practice
*   Do not label a Vessel entity as "Asset" in components or UI buttons.
*   Do not configure a Vessel document with an uppercase or spaces slug (such as `"My Yacht"`).

