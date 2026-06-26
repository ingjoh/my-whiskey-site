---
type: Concept
title: "Organization"
description: "The business entity owning or managing charter operations."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Organization

The **Organization** represents the operating company. 

## Details
*   Governs default bank details, Stripe Connect account mappings, tax configurations, and global website configurations.
*   All assets and bookings belong to or reference an Organization context.

## Examples

### Good Practice
*   Store company-wide tax rates and branding styles inside an Organization config document in Firestore.

### Bad Practice
*   Do not create duplicate Organization records for different yachts; manage multiple vessels under a single Organization to enable unified accounting.

