---
type: ADR
title: "ADR-002: AI-Native Knowledge Architecture"
description: "Decision context and rationale behind adopting the Open Knowledge Format (OKF), Index Registry, Graphify, and automated governance."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-002: AI-Native Knowledge Architecture

## Status
Accepted

## Context
As LLM-based coding agents (e.g., Google's Antigravity) are integrated into the repository development lifecycle, traditional documentation layouts (like Wikis, flat docs, or code comments) fail. Traditional documentation is hard for AI agents to programmatically navigate, leading to context drift, hallucinated database structures, and missed boundary or deprecation warnings. Furthermore, without a structured relationship registry, there is no way to automatically verify if code changes have broken logical boundaries, created orphaned files, or drifted from established concepts.

Specifically, this long-lived luxury yacht charter platform needs a durable and explicit knowledge layer for the following reasons:
*   **Long-lived Platform**: Requires durable architectural memory that survives team rotations and developer transitions.
*   **AI-Assisted Development**: AI agents require clear, highly structured context inputs to generate correct, boundary-respecting implementations without hallucinating database structures or naming conventions.
*   **Multiple Agents/Developers Over Time**: Different agents and human developers will touch the codebase, increasing the risk of inconsistent design patterns.
*   **Risk of Terminology Drift**: Without a single source of truth for business concepts, terminology drift can occur across services (e.g., calling a "Vessel" a "Yacht" or "Boat" in database schemas).
*   **Risk of Stale Documentation**: Documentation quickly becomes disconnected from code unless verified programmatically.
*   **Need for Durable Architectural Memory**: Capturing the *why* of stack and architectural choices ensures future modifications respect original design boundaries.

## Alternatives Considered
*   **Alternative A: Static Wiki (GitHub Wiki / Notion)**: Keeps documentation clean for human developers, but is disconnected from the codebase. AI agents cannot easily read or update it, leading to inevitable document-code drift.
*   **Alternative B: Inline Code JSDoc / TSDoc**: Documents code at the function or variable level, but fails to capture macro-level business concepts, cross-component relationships, design-system tokens, and high-level architectural context.
*   **Alternative C: Standard `/docs/` Directory**: Flat markdown documents without structured metadata. AI agents treat these as raw, unstructured text, making relationship validation and programmatic indexing extremely difficult.

## Decision
We are adopting an **AI-Native Knowledge Architecture** composed of several integrated layers to govern developer and agent activity:

1.  **Rule/Behavior Layer (`AGENTS.md`)**: Configures instructions and behavioral limits for AI agents. This layer does not document business logic but defines how agents must act (e.g., pre-implementation audit mandates, compile verification).
2.  **Workflow/Automation Layer (Antigravity Skills)**: Codifies operational steps and automation playbooks (e.g., scaffolding API endpoints, executing impact analysis, updating registry). These are repeatable procedures defined under `.agents/skills/`.
3.  **Authoritative Prescriptive Knowledge Layer (`/knowledge`)**: Holds domain models (Concepts, Design, Architecture, Operations). Delineates *what the system should be* (business rules, schemas, styling tokens) independently of code implementation, using the **Open Knowledge Format (OKF)**.
4.  **Registry Layer (`knowledge/index.yaml`)**: Maps metadata relationships, dependencies, and owners of all knowledge objects. Serves as a machine-readable directory for programmatic validation.
5.  **Architectural Decision Layer (ADRs)**: Documents history and rationale of technical stack and architecture decisions, capturing the *why* behind design trade-offs.
6.  **Descriptive Code Intelligence Layer (Graphify)**: Automatically analyzes code AST to map imports and dependencies. Purely descriptive of *what exists* in code, serving as a feedback loop for the prescriptive layer.
7.  **Verification/Governance Layer (`knowledge-health.js`)**: Automates checks (e.g., index consistency, link resolution) to ensure knowledge and code do not drift.

## Rationale
Each layer serves a distinct purpose, avoiding overlap while forming a comprehensive governance loop:
*   `AGENTS.md` governs **who/how** (agent behavior).
*   *Skills* govern **what to run** (repeatable execution tasks).
*   `/knowledge/concepts` govern **what it means** (domain terminology, rules, schemas).
*   `index.yaml` registry governs **how knowledge connects** (relations).
*   `decisions/` ADRs govern **why it was built this way** (architecture history).
*   `Graphify` governs **how the code is actually structured** (descriptive AST).
*   `knowledge-health.js` governs **audit/integrity checks** (anti-drift).

By separating the *prescriptive* layer (how things *should* be designed in `/knowledge`) from the *descriptive* layer (how things *are* structured in `Graphify`), we can identify drift and enforce code boundaries programmatically.

## Consequences

### Positive
*   **Better AI Context**: Agents can dynamically load exactly the files they need for a task (concepts, design tokens, server/client boundaries) by reading dependencies in `index.yaml`.
*   **Less Terminology Drift**: Single, registry-backed definitions for business logic (e.g., `Vessel`, `Booking`) ensure database naming conventions remain uniform.
*   **Better Onboarding**: New human developers and AI agents can read `PROJECT_INDEX.md` and immediately understand the entire architectural landscape.
*   **Easier Refactors**: Impact analysis highlights affected modules and concept dependencies before any code is modified.
*   **Stronger Long-Term Maintainability**: System checks fail builds if documentation or relationships drift.

### Tradeoffs & Current vs. Future State
*   **Upfront Discipline (Current State)**: Humans and agents must maintain metadata frontmatter and register new files manually.
*   **Impact Analysis Requirement**: Before starting work, agents must execute `knowledge-impact-analysis` and `decision-impact-analysis`.
*   **Future Direction (Automation)**: In the future, we plan to fully automate registry mapping, sync metadata directly from git commits, and integrate strict CI blockages on boundary violations (currently soft-checks and reports).

## Operating Rule
Every non-trivial feature, refactor, domain change, design-system change, or architecture change must consider whether knowledge objects, registry entries, ADRs, skills, or `AGENTS.md` need updating. 

At a minimum, any change impacting domain concepts or architecture decisions must:
1.  Run a pre-implementation impact audit via custom skills.
2.  Update the affected concepts or draft a new ADR.
3.  Register any additions or removals in `knowledge/index.yaml`.
4.  Append an entry to `knowledge/log.md` detailing the changes.
5.  Run `npm run knowledge-health` locally to verify zero drift.
