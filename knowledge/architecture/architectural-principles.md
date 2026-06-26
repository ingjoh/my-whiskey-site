---
type: Architecture
title: "Architectural Principles"
description: "Core design tenets guiding technical decisions and architectural alignments."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Architectural Principles

This document defines the core engineering tenets that govern technical choices, design trade-offs, and implementation strategies for the **MY Whiskey** platform.

---

## 1. Current State

The active architecture relies on the following principles:

*   **Managed Services over Custom Infrastructure**: Use serverless offerings (Firebase Hosting, Cloud Firestore, Stripe, Resend) to eliminate server management overhead.
*   **Thin Client / Server-First Execution**: Use React Server Components (RSC) to handle data fetching, metadata generation, and heavy layouts on the server, serving lightweight HTML to the browser.
*   **Knowledge-Before-Code**: All code changes must align with registered business ontology and architectural specifications. Writing code without updating the registry or logical models is considered technical drift.

---

## 2. Approved Direction

The approved guidelines for all new system modifications include:

*   **AI-First Repository Design**: The repository is optimized for both human engineers and AI coding agents. This is achieved by maintaining clear, machine-readable metadata frontmatter, consistent naming patterns, and Graphify code mappings.
*   **Composition over Duplication**: Rather than replicating service abstractions (e.g. creating duplicate mailing functions), build composable APIs that receive structured inputs.
*   **Security-by-Design**: Isolation of credentials to server environments. Client components must only receive minimal, scrubbed datasets. Direct database edits from the client are forbidden.
*   **Progressive Enhancement**: Crucial page functions (viewing listing details, selecting charter dates) must function using pure HTML forms/SSR, with interactive client scripts (`@dnd-kit`, map animations) layered on top as enhancements.

---

## 3. Potential Future

*   **Multi-tenant Isolation**: Strict database-level organization isolation schemas for white-label yacht brokerage deployments.
*   **Edge-Native Middleware Routing**: Shifting auth and localized redirect logic to Edge functions globally.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
