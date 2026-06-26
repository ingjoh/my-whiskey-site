---
type: Concept
title: "Payment"
description: "The financial transaction record tracking charter fees, deposits, and refunds."
owner: "Finance"
status: "Authoritative"
maturity: "core"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Payment

A **Payment** tracks transactions bound to a Booking.

## Operations & Logic
*   Payments utilize Stripe Connect for payment splitting.
*   Supports splits between the operator, crew, and external booking agencies.
*   Records payment methods (e.g. Card, EFT Bank Transfer) and reconciliation reference codes.

## Examples

### Good Practice
*   Create a Payment document in Firestore to record each Stripe Checkout split event success.
*   Trace payment methods and include bank reconciliation reference strings for EFT bank transfers.

### Bad Practice
*   Never mark a Payment transaction as "Completed" before receiving the matching webhook notification event from Stripe.

