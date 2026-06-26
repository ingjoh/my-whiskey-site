---
type: ADR
title: "ADR-002: AI-Native Knowledge Architecture"
description: "Decision context and rationale behind adopting the Open Knowledge Format (OKF), Index Registry, and Graphify."
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
As LLM-based coding agents (e.g., Google's Antigravity) are integrated into the repository lifecycle, traditional documentation layouts fail. Agents suffer from context drift, hallucinate database structures, and miss deprecation warnings. Without a structured relationship registry, there is no way to automatically verify if code changes have broken logical boundaries or created orphaned pages.

We need a system that defines prescriptive business concepts and maps their physical files, code entry points, and dependencies in a way that is easily parsed by both humans and AI agents.

## Alternatives Considered
*   **Alternative A: Static Wiki (GitHub Wiki / Notion)**: Keeps documentation clean for humans, but disconnected from the codebase. AI agents cannot easily read or update it, leading to document-code drift.
*   **Alternative B: Inline Code JSDoc / TSDoc**: Documents code at the function level, but fails to capture macro-level business concepts, relationships, and ADR context.
*   **Alternative C: Standard `/docs/` Directory**: Flat markdown documents without structured metadata. AI agents treat these as raw text, making programmatic indexing and relationship validation difficult.

## Decision
Select **Google's Open Knowledge Format (OKF)** for structuring metadata-driven **Knowledge Objects** in the `/knowledge/` directory, backed by a central **Knowledge Registry** (`index.yaml`) and verified using **Graphify** (descriptive AST mapping) and automated **Knowledge Health Checks** (`knowledge-health.js`).

### Core Mechanics
1.  **Metadata Frontmatter**: Every knowledge object contains YAML frontmatter defining its `type`, `title`, `owner`, `status`, `maturity`, and version metadata.
2.  **Central Registry (`index.yaml`)**: Maps concept dependencies, ownership, and code implementations.
3.  **Governance Loop**: The `knowledge-health.js` script runs during local pre-commit and CI/CD pipelines to ensure no unregistered concept files exist, and that all concept-to-concept links are valid.

## Consequences
*   **Positive**: Zero documentation drift. AI agents can check logical dependencies programmatically.
*   **Positive**: High quality context building. Agents can load the relevant concept files before making code edits.
*   **Neutral**: Requires developers to keep metadata updated when refactoring directory paths.
