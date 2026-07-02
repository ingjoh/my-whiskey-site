---
type: ADR
title: "ADR-005: Decoupled Multi-Party Payment Settlement and Commission Engine"
description: "Architecture for multi-party commission calculation, payment ledger isolation, accepted offer immutability, and async operational cost adjustments."
owner: "Finance"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-005: Decoupled Multi-Party Payment Settlement and Commission Engine

## Status
Accepted

## Context
As we transform the booking system into a multi-tenant platform, financial flows become complex. A single booking transaction can involve multiple financial actors:
1.  **Guest**: Pays the grand total (charter fee, convenience fees, tax).
2.  **Operator Tenant**: Receives the net charter revenue.
3.  **Broker / Partner**: Receives a commission payout.
4.  **Platform**: Receives a service fee or convenience fee cut.
5.  **Crew (Captains, Chefs)**: Receive hourly/daily operational payouts (Phase 3).

To guarantee auditable accounting and handle transaction changes, we need a settlement strategy that:
*   Ensures absolute accuracy of the commercial contract.
*   Enforces immutable records of customer checkout transactions.
*   Handles changes in operational cost (e.g. crew substitutions, resource upgrades) without corrupting the customer's receipt or the billing ledger.

## Alternatives Considered
*   **Alternative A: Inline Stripe/Gateway Allocations**: Triggering splits directly on the payment gateway at checkout. This couples accounting to Stripe-specific webhooks and makes operational modifications (like changing a crew member after checkout) extremely difficult, as we would have to trigger manual transfer reversals on Stripe.
*   **Alternative B: Mutating Bookings/Offers on Cost Changes**: Modifying the original Booking or Offer pricing fields when operational costs change. This corrupts historical checkout receipts, breaks financial auditing, and violates basic ledger design principles.

## Decision
We adopt a **Decoupled Settlement Ledger with Async Adjustment Entries**:

1.  **Decoupled Settlement Layer**: Financial splits are calculated and written to a separate `Settlement` collection prior to payout execution. The transaction billing system reads from the `Settlement` ledger, completely isolated from payment gateway details.
2.  **Immutable Offers**: The accepted `Offer` serves as the commercial contract and is completely immutable. Once checked out, its pricing snapshot cannot be edited.
3.  **Asynchronous Cost Adjustments**: If operational changes introduce cost differences during execution (such as substituting a captain with a higher rate, or swapping gear add-ons):
    *   The original `Offer` and `Booking` prices remain unchanged.
    *   The `Settlement` engine writes a new **Adjustment Ledger Entry** referencing the target booking.
    *   Payout calculations (net operator transfer, net crew transfer) sum the original allocation and all corresponding adjustments, while leaving the customer's initial invoice intact.

## Rationale
This architecture ensures total compliance with financial auditing requirements by treating the customer agreement as immutable, while providing the operational agility to swap assets or crew members on the fly. Isolating gateway actions from split logic makes the platform payment-provider agnostic.
