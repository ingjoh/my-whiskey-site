---
type: ADR
title: "ADR-001: Technical Stack Foundation"
description: "Decision context and rationale behind adopting Next.js, Cloud Firestore, and Stripe Connect."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-001: Technical Stack Foundation

## Status
Accepted

## Context
The platform requires a scalable booking engine with fast public page loading (SEO) and support for payment splitting between operator and crew.

## Alternatives Considered
*   *Alternative A: Node/Express + Postgres*: Relational database consistency, but requires infrastructure maintenance and lacks schema flexibility for custom dynamic page builders.
*   *Alternative B: Shopify*: Too rigid for complex time-slot calendar allocations and crew scheduling relocation calculations.

## Decision
Select **Next.js 16 (App Router)** for rendering, **Cloud Firestore** for zero-ops NoSQL flexible data storage, and **Stripe Connect** for split payment support.
