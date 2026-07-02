---
type: Concept
title: "Capability"
description: "The professional qualification or skill record possessed by a Person, such as captain, chef, or guide licenses."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Capability

A **Capability** represents the professional qualifications, skills, licenses, and certifications held by a specific **Person** (e.g., Captain licenses, ServSafe Chef certifications, Divemaster credentials).

## Details
*   Clearly separated from organizational **Roles**. A person may be assigned the Role of "Admin" but possess the Capability of "Chef".
*   Used during operational planning to assign qualified resources to itineraries (e.g. scheduling a Captain and Chef for a luxury cruise).
*   Contains certification names, license numbers, issuing authorities, and expiration dates.

## Examples

### Good Practice
*   Create a Capability document of type `captain` for a person, containing their USCG license details and expiration dates.
*   Query for all people possessing the `chef` Capability when assigning crew resources for an upcoming charter.

### Bad Practice
*   Do not combine professional skills with access roles. A captain has a `captain` Capability, but their permission to access the booking dashboard is governed by their organizational `Role Assignment`.
