---
type: Concept
title: "Booking"
description: "A scheduled yacht charter transaction that links a Guest, Adventure, and Vessel to a specific date and time slot."
owner: "Domain"
status: "Authoritative"
maturity: "core"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Booking

A **Booking** represents the single record of truth for a customer yacht charter. It manages calendar allocations, guest details, adventure specifics, and payment splits.

## Properties & Naming Rules
*   Every Booking is bound to a single date (`date` as `YYYY-MM-DD`) and slot time (`startTime` as `HH:MM`).
*   It references a specific `vesselSlug` (matching a Vessel concept).
*   It references a specific `guestName`, `guestEmail`, and `guestPhone` (matching a Guest concept). Do not refer to guest fields as "customer" or "client".
*   It references an `adventureId` matching the excursion selected.

## Relationships
*   Depends on **Guest** to map client profile data.
*   Depends on **Vessel** to check slot availability and relocation travel times.
*   Depends on **Adventure** to pull pricing templates.
*   Depends on **Payment** to trace deposits and balance payments.

## Examples

### Good Practice
*   `guestName: "John Doe"` is used to capture the booking's lead guest name.
*   Assigning `vesselSlug: "whiskey"` using lowercase hyphenated characters.

### Bad Practice
*   Never use a Booking entity to represent a pending or unpaid inquiry (use **Proposal**).
*   Do not name guest attributes `customerEmail` or `userName` in the database schema.

### Common Mistakes
*   Leaking Stripe checkout secrets directly to client component hooks without backend route verification.
