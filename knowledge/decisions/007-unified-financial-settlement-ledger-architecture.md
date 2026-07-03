---
type: ADR
title: "ADR-007: Unified Financial Settlement and Ledger Architecture"
description: "Core architectural boundaries decoupling cash transactions and invoices from immutable settlement allocations."
owner: "Finance"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-007: Unified Financial Settlement and Ledger Architecture

## Status
Accepted

## Context
The platform needs a robust, audit-compliant system to distribute booking revenues and calculate fees (owner shares, platform cuts, captain/crew splits, concierge commissions, and sales taxes). Coupling this logic directly to commercial bookings or specific payment processor APIs (like Stripe Connect) creates high refactoring costs and limits support for non-card instruments, corporate terms, or complex adjustments.

## Decision
We establish a **Unified Financial Settlement and Ledger Architecture** governed by the following decisions:

1.  **Strict Ledger Decoupling**: We separate the financial domain into four dedicated, gateway-independent concepts:
    *   **Settlement**: The authoritative ledger of how revenue is distributed/split.
    *   **Invoice**: The Accounts Receivable representation of client obligations.
    *   **Transaction**: The record of cash inflows/outflows satisfying the ledger.
    *   **Payout**: Outflows transferred to partners, crew, or owners.
2.  **Ledger Immutability**: Historical financial records must never be modified or deleted. Any corrections, modifications, or trip cancellations must be represented as additional debit/credit ledger entries (Transaction adjustments) to ensure full auditability.
3.  **Payment Instrument Independence**: The settlement engine is completely decoupled from payment execution. It naturally supports Card checkouts, ACH, Invoices, Cash, Credits, and future balances.

## Future Considerations

### A. Dynamic Settlement Split Entries
To keep the engine extensible, the Settlement splits will operate as an extensible collection of ledger entries mapping types (taxes, clean fees, commission rates) to general recipients, instead of hardcoding static schema fields.

### B. Many-to-Many Transaction Allocations
The transaction system will eventually support:
*   *One Transaction paying multiple Settlements* (e.g. a single corporate invoice wire satisfying several bookings).
*   *One Settlement satisfied by multiple Transactions* (e.g. split deposit + balance charges, or gift certificates combined with card checkout).

### C. Stored Value and Wallet Programs
Diverse customer programs (loyalty credits, prepaid corporate programs, local club memberships, stored-value accounts) will sit *above* the Settlement layer, consuming it as a generic payment instrument source.
