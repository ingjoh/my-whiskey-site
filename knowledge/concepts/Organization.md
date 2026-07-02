---
type: Concept
title: "Organization"
description: "The business entity owning or managing charter operations, serving as the default tenant boundary."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Organization

The **Organization** represents the operating company and acts as the default logical tenant boundary (`tenantId`).

## Details
*   Governs default bank details, Stripe Connect account mappings, tax configurations, and global website configurations.
*   All assets and bookings belong to or reference an Organization context through the `tenantId` field at the physical schema layer (logical isolation per ADR-003).
*   Instead of storing a single primary contact directly on the organization document, contact responsibilities and ownership are mapped dynamically using scoped **Role Assignments** linked to a **Person**.

## Examples

### Good Practice
*   Filter bookings, calendar events, and media items by matching the user's active scoped Organization ID (`tenantId`).
*   Reference the active Organization's Stripe Connect credentials for checkout and settlement.

### Bad Practice
*   Do not store a hardcoded `contactPersonId` directly in the Organization document; use a Role Assignment instead.
