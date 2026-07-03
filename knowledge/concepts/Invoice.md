---
type: Concept
title: "Invoice"
description: "The Accounts Receivable representation of commercial obligations and payment terms."
owner: "Finance"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Invoice

An **Invoice** represents a temporary financial obligation (Accounts Receivable) with designated payment terms (e.g. Net 30 or Due on Receipt) issued to a client (Person or Organization).

## Properties & Naming Rules
*   Represented in the code as an `InvoiceDocument` in the `invoices` collection.
*   Uniquely identified by an invoice prefix and UUID (e.g. `id: "invc_uuid"`).
*   Links to the commercial contract origin via `originType` and `originId`.
*   Specifies recipient details using `billToType` and `billToId`.

## Examples

### Good Practice
*   Billing an organization: `billToType: 'organization'`, `billToId: 'org_concierge_destin'`.
*   Tracking invoice status states (`draft`, `open`, `paid`, `void`, `uncollectible`).

### Bad Practice
*   Do not bind Invoices directly to Stripe. Stripe Invoicing is an integration layer; the platform's internal `/invoices` documents are the source of truth.
