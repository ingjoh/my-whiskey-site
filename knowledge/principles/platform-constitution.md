---
type: Principles
title: "Platform Constitution"
description: "Constitutional rules governing the alignment of code, API schemas, and documentation with the Canonical Platform Domain Model."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Platform Constitution

This document establishes the governing principles for the design, architecture, and code representation of the platform. It serves as the primary constitutional rulebook for both human developers and Google Antigravity agents.

---

## Core Principles

1.  **Authoritative Language**: The Canonical Platform Domain Model is the absolute source of truth for the business language of the platform.
2.  **Knowledge Precedes Implementation**: No code, database schemas, API endpoints, or user interfaces may be written or modified without first defining, validating, and registering the underlying business concepts in the Knowledge Catalog.
3.  **Code Implements the Domain**: Code is a physical manifestation of the domain model. Code does not define the domain model; it strictly implements it.
4.  **Universal Naming Alignment**: All database schemas, API requests/responses, React components, documentation files, automated tests, AI prompts, and external integrations must align uniformly with the naming conventions established in the domain model.
5.  **Gated Model Changes**: Any modifications or additions to the Canonical Domain Model must pass a formal architectural review before code changes are drafted or executed.
6.  **Extensibility Over Fragmentation**: Future implementation decisions and feature designs must extend the existing domain vocabulary rather than introducing competing, redundant, or parallel terminology.
