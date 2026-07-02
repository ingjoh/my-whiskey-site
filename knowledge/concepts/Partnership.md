---
type: Concept
title: "Partnership"
description: "The commercial relationship contract between the Platform and an Identity (Person or Organization)."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Partnership

A **Partnership** represents a commercial agreement and relationship between the platform and a specific business identity (**Person** or **Organization**).

## Details
*   Defines commercial commissions, payouts, agreements, onboarding states, and Stripe custom account bindings.
*   Maps to a target identity via the `identityType` ('person' | 'organization') and `identityId` fields.
*   Enables external entities (such as travel advisors, concierge companies, fleet managers, or independent captains) to earn payouts or pay commissions on the platform.

## Examples

### Good Practice
*   Store dynamic commission structures (e.g. 15% broker payout) and Stripe Connect parameters in the Partnership document.
*   Suspend a partner's bookings or payouts by setting `status: "suspended"` on their Partnership record.

### Bad Practice
*   Do not hardcode commission rules inside the checkout script; reference the corresponding active Partnership parameters.
