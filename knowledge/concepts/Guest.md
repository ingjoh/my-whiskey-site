---
type: Concept
title: "Guest"
description: "The end customer booking and experiencing the yacht charter."
owner: "Domain"
status: "Authoritative"
maturity: "core"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Guest

A **Guest** is the customer record. The platform prioritizes high-end personalized hospitality, making guest-centric naming critical.

## Naming Rules
*   Do not use the generic terms "Customer", "Client", or "User" in booking database schemas or guest-facing layouts.
*   Always use properties: `guestName`, `guestEmail`, `guestPhone`, `guestCount`.

## Examples

### Good Practice
*   Use variables `guestEmail` and `guestPhone` to store guest profile attributes.
*   Display titles like "Guest Details" or "Guest Concierge" in user dashboards.

### Bad Practice
*   Never map input forms to parameters like `customer_name` or `client_id` in API handlers.

