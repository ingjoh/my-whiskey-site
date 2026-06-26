---
type: Principles
title: "Engineering Principles"
description: "Core coding philosophies, naming alignment rules, and design-before-code requirements."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Engineering Principles

This document defines the development practices, coding philosophies, and repository rules that developers and AI agents must follow.

---

## 1. Current State

The active codebase aligns to these principles:
*   **Simplicity Before Abstraction**: Keep code readable and direct. Avoid premature optimizations or over-engineering patterns that make it hard for agents to follow logic.
*   **Strict Typing**: All new source files must enforce full TypeScript typing. Implicit `any` declarations are forbidden.

---

## 2. Approved Direction

The approved development guidelines are:

*   **Single Source of Truth in `index.yaml`**: The domain model defined in `index.yaml` is the authoritative reference for naming database tables, variables, and services.
*   **Registry-First Naming**: Never invent new database entities or variables. All names must be validated against `index.yaml` and individual concepts under `/knowledge/concepts/` (e.g. use `Guest` instead of `Customer` or `User`).
*   **Code Implementing Knowledge**: Code is a manifestation of the registered knowledge. Design and register the system concepts under `/knowledge/` first, review relationships, and then write the corresponding implementation code.
*   **Self-Verification**: Every change must compile cleanly and pass automated checks before being merged. Drift check commands (`npm run knowledge-health`) must be run locally before proposing code changes.

---

## 3. Potential Future

*   **Semantic Linting Rules**: Custom ESLint plugins that verify if variable names and Firestore imports match the keys defined in `index.yaml` at build time.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
