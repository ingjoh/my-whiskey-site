---
type: Concept
title: "Settlement"
description: "The authoritative financial ledger mapping receivables distribution and splits."
owner: "Finance"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Settlement

A **Settlement** is the authoritative financial ledger representing the final distribution of revenue and fees for a commercial transaction. It determines who owes whom and is independent of the payment mechanism used to satisfy the obligation.

## Properties & Naming Rules
*   Represented in the code as a `SettlementDocument` in the `settlements` collection.
*   Uniquely identified by a settlement prefix and UUID (e.g. `id: "set_uuid"`).
*   Links to its commercial contract source via `originType` and `originId`.
*   Maintains a list of dynamic ledger entries in `splits` mapping allocations (Platform Fee, Owner Revenue, Captain Payout, Taxes, Partner Commissions) to recipients.

## Examples

### Good Practice
*   Retrieving total collected amount: `settlement.totals.collectedAmount`.
*   Filtering platform fees from splits: `settlement.splits.filter(s => s.type === 'platform_fee')`.

### Bad Practice
*   Never edit historical Settlement split records. Any financial corrections must be appended as adjustment transactions rather than rewriting posted ledger documents.
