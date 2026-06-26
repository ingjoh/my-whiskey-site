---
type: Architecture
title: "Long-Term AI-Native Knowledge Architecture"
description: "Implementation plan for establishing a self-governing knowledge architecture."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Long-Term AI-Native Knowledge Architecture (Revised & Hardened)

This document defines the comprehensive implementation plan for establishing a self-governing, AI-native knowledge architecture in the **MY Whiskey** repository. It transitions the repository from a traditional static document layout to a system of **atomic, metadata-driven Knowledge Objects** and **explicit Knowledge Relationships**, designed to be read, maintained, and verified by humans and AI agents (such as Google's Antigravity) over years of development.

---

## 1. High-Level Architecture & Layer Responsibilities

We organize the repository into five distinct layers, separating behavioral directives, operational workflows, authoritative knowledge models, descriptive structural graphs, and automated governance:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. AGENT BEHAVIOR LAYER (Global & Local Guardrails: AGENTS.md)         │
│    - Dictates behavioral rules, security limits, & build mandates       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. OPERATIONAL PLAYBOOK LAYER (Antigravity Skills: /.agents/skills/)   │
│    - Step-by-step custom workflows (e.g. scaffolding, audits)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. KNOWLEDGE OBJECT LAYER (Google's OKF: /knowledge/)                  │
│    - Atomic business & system objects, ADR decisions, & Registry map   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. CODE INTELLIGENCE LAYER (Graphify AST: GCS / local json)            │
│    - Automated, descriptive code relationships & dependency graphs     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. GOVERNANCE & GATING LAYER (CI/CD scripts: /scripts/)                │
│    - Automated validation of logical relationships & naming rules      │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer Rationale & Rationale for Separation:
1.  **Agent Behavior Layer (`AGENTS.md`)**: Regulates *agent execution conduct*. Kept at the root (and `/src/` root) because LLMs naturally load root policy definitions first. Contains no code playbooks or domain details.
2.  **Operational Playbook Layer (`/.agents/skills/`)**: Contains procedural "how-to" scripts for code modifications. Kept separate to prevent knowledge models from being cluttered with developer actions.
3.  **Knowledge Object Layer (`/knowledge/`)**: Stores atomic, structured concepts (business entities, design tokens, architectural plans, and system decisions) mapped via a central relationships registry.
4.  **Code Intelligence Layer (Graphify)**: Automatically maps the codebase *as it exists* structurally. Separated because it is purely *descriptive* (AST-derived), whereas the Knowledge Object Layer is *prescriptive* (domain models, design systems).
5.  **Governance & Gating Layer (`/scripts/`)**: Integrates checkers directly into CI pipelines to enforce naming conventions and detect documentation drift.

---

## 2. Directory Structure

To keep a clean separation between internal builders' knowledge and external users' instructions, we separate `/knowledge/` from `/docs/`:

```
├── / (Root)
│   ├── AGENTS.md                         # Global agent guardrails & workflow policies
│   ├── PROJECT_INDEX.md                  # Human & agent onboarding index
│   ├── /knowledge                        # OKF Knowledge Catalog Bundle Root (For AI & human builders)
│   │   ├── index.yaml                    # The Knowledge Registry (business relationships, owners)
│   │   ├── log.md                        # Chronological log of knowledge updates
│   │   ├── /concepts                     # Atomic Business Objects (OKF files)
│   │   │   ├── Booking.md
│   │   │   ├── Proposal.md
│   │   │   ├── Vessel.md
│   │   │   └── ...
│   │   ├── /architecture
│   │   │   └── overview.md               # High-level architecture (logical boundaries)
│   │   ├── /design
│   │   │   └── system.md                 # Design system tokens & visual guidelines
│   │   └── /decisions                    # Architecture Decision Records (ADRs)
│   │       ├── README.md
│   │       └── 001-core-stack.md
│   ├── /docs                             # External User Documentation (For users & consumers)
│   │   ├── setup.md                      # Developer environment setup
│   │   ├── api.md                        # Public API endpoints usage
│   │   └── deployment.md                 # Operation runbooks
│   ├── /src
│   │   ├── AGENTS.md                     # Local source-level code quality rules
│   │   └── ...                           # Next.js Application Source files
│   ├── /.agents
│   │   └── /skills                       # Custom Antigravity Agent Playbooks & Auditing Skills
│   │       ├── /knowledge-impact-analysis
│   │       │   └── SKILL.md              # Scans proposed code and lists concepts to modify
│   │       ├── /decision-impact-analysis
│   │       │   └── SKILL.md              # Scans changes to core objects, flagging affected ADRs/services
│   │       ├── /update-knowledge
│   │       │   └── SKILL.md              # Helper for updating knowledge objects post-implementation
│   │       ├── ...
│   └── /scripts                          # Governance Gating Scripts (Executed locally & in CI)
│       ├── verify-boundaries.js          # Enforces frontend/backend SDK imports boundaries
│       ├── knowledge-health.js           # Gathers overall catalog stats and checks links/relationship health
│       └── generate-graph.js             # Generates Graphify AST outputs
```

---

## 3. The Knowledge Object Model & Google's OKF

Rather than grouping many terms into a large text document (`taxonomy.md`), we represent each business entity, decision, and system detail as an **atomic Knowledge Object** in Google's **Open Knowledge Format (OKF)**.

### Concept Document Schema & Metadata:
Every concept file (e.g. `knowledge/concepts/Booking.md`) begins with standard YAML:
```yaml
---
type: Concept
title: "Booking"
description: "A scheduled charter transaction linking a Guest, Adventure, and Vessel."
owner: "Domain"
status: "Authoritative"               # Draft | Review | Authoritative | Deprecated
maturity: "core"                      # experimental | draft | stable | core | legacy | deprecated
review_frequency: "Quarterly"
verified_against: "main@4d7a9bc"      # Links documentation state to a specific git commit
tags: [core, transaction, scheduling]
---

# Booking

A Booking represents a single charter excursion...

## Examples

### Good Practice
*   One booking references one vessel, one lead guest, and one adventure.

### Bad Practice
*   Do not use a Booking object to represent a preliminary customer proposal.

### Common Mistakes
*   Leaking Stripe checkout sessions directly to the client state without verifying transactional webhook success.
```

### Concept Directory Evolution Path:
As concepts grow in complexity over time (adding custom diagrams, lists of FAQs, or history detail), they can be refactored from a flat file (e.g., `concepts/Booking.md`) into a concept directory (`concepts/Booking/` containing `concept.md`, `examples.md`, `faq.md`, `history.md`, `diagrams.md`). This refactoring should only be done if the markdown file exceeds 150 lines, keeping the catalog lightweight for initial sprints.

### Decoupled Implementation References:
To prevent documentation from breaking when code files are refactored or renamed, we avoid hardcoding absolute file paths (e.g. `file://src/lib/db.ts`). Instead, we reference **logical identifiers** which map to physical files (e.g. `implemented_by: booking-service`).

---

## 4. The Knowledge Registry (`knowledge/index.yaml`)

The **Knowledge Registry** is the central directory of human-curated business knowledge. It serves as the business-relationship equivalent of Graphify's structural AST graph.

```yaml
Booking:
  owner: Domain
  status: Authoritative
  maturity: core
  depends_on:
    - Guest
    - Adventure
    - Vessel
  implemented_by:
    - booking-service
    - checkout-api
  adr_references:
    - 001-core-stack

Vessel:
  owner: Operations
  status: Authoritative
  maturity: core
  depends_on:
    - Organization
  implemented_by:
    - asset-service
```

### Knowledge Relationships Graph:
By combining the **Knowledge Registry** (business relationships) with **Graphify** (code implementation relationships), we build a complete organizational graph:

```
  [Business Object] Booking ────────► depends on ────────► [Business Object] Vessel
         │                                                        │
    implemented by                                           implemented by
         │                                                        │
         ▼                                                        ▼
[Code Service] booking-service ───► imports/calls ───► [Code Service] asset-service
```

---

## 5. Graphify Code Intelligence Model

*   **Descriptive Role**: Graphify is purely descriptive of the codebase as it exists. It reads imports, classes, and folder maps. It does not replace the prescriptive definitions in `/knowledge/`.
*   **Artifact Isolation**: All generated artifacts (`graph.json`, `graph.html`, `GRAPH_REPORT.md`) are gitignored.
*   **CI/CD Deployment**: On pushes to `main` or `staging`, GitHub Actions automatically runs `npm run generate-graph` and uploads the resulting JSON and HTML outputs to `gs://mywhiskey-code-graph/`.
*   **Future MCP Server Plan**: As the codebase expands, we will package the GCS bucket reader inside an MCP server so that Antigravity agents can query codebase relationships directly using tools (e.g., "Find all API routes using `adminDb`").

---

## 6. Knowledge Governance & Gating System (Anti-Drift)

To ensure documentation evolves naturally alongside source code, we establish automated gates in our CI/CD workflow:

### Mandatory Development Lifecycle:
```
1. Knowledge & Decision Impact Analysis (Pre-implementation audit)
   * Mandatory Question: "Does this change introduce a new concept, or is it another implementation of an existing concept?"
   ▼
2. Technical Implementation Plan Drafting
   ▼
3. Code Modification Execution
   ▼
4. Knowledge Object Updates & verified_against Commit Bump
   ▼
5. Local & CI/CD Compilation Verification
```

### Automated Health Verification:
Instead of immediately implementing strict, build-breaking PR blocking, we will write a `scripts/knowledge-health.js` reporter. This script scans the registry, verifies relationships, identifies orphans, and tracks concept verification status to print a catalog health dashboard:

```
==================================================
KNOWLEDGE CATALOG HEALTH REPORT
==================================================
Total Concepts: 10
  - Core: 6
  - Stable: 3
  - Experimental: 1
  - Deprecated: 0

Registry Alignment:
  ✓ 10/10 registered in index.yaml
  ✓ 0/10 orphan concepts detected
  ✓ 10/10 verified_against commit matches
  ✓ 0 broken relationship links found

ADR Decisions logged: 1
Logical service implementations mapped: 4
==================================================
```

---

## 7. Antigravity Custom Skills Library

We establish these playbooks in `/.agents/skills/` to empower agents to perform automated governance:

*   **`knowledge-impact-analysis`**: Scans the proposed task and checks index.yaml.
    *   *Mandatory Verification*: Explicitly prompts the agent to ask: *"Does this change introduce a new concept, or is it simply another implementation of an existing concept?"* to prevent accidental duplication.
*   **`decision-impact-analysis`**: Checks if changes to core concepts (like Booking, Stripe, or Firestore) affect specific ADRs, services, APIs, or tests.
*   **`update-knowledge`**: Automates editing the target OKF documents, updating the `verified_against` commit reference to the latest HEAD, and appending changes to `/knowledge/log.md`.

---

## 8. Rollout Plan

We divide the implementation plan into five distinct phases, introducing a pragmatic validation loop before CI/CD automation:

### Phase 1: Knowledge Object MVP (Complete)
*   [x] Reorganize documentation under the new `/knowledge/` structure.
*   [x] Set up atomic files under `/knowledge/concepts/` (Booking.md, Vessel.md, Guest.md, etc.) and write the `knowledge/index.yaml` relationships registry.
*   [x] Update global and local `AGENTS.md` instructions to mandate the new architecture workflow.
*   [x] Build the initial `scripts/generate-graph.js` parsing script and package.json trigger.
*   [x] Create the `knowledge-impact-analysis` and `decision-impact-analysis` playbooks.

### Phase 2: Pragmatic Validation & Health Reporting (Current Sprint)
*   [x] Write the **`scripts/knowledge-health.js`** validation script to gather and display registry statistics, orphan lists, and link consistency checks.
*   [x] Add **Good/Bad examples, Common Mistakes, and maturity indicators** to all initial concepts under `/knowledge/concepts/`.
*   [ ] Execute the manual validation loop: Use the architecture on real feature additions for 1-2 weeks to verify concept boundaries, playbook friction, and registry schemas.

### Phase 3: CI/CD Gates & GCS Uploads
*   [ ] Integrate the health reporter and component boundary checks (`scripts/verify-boundaries.js`) as verification steps inside `.github/workflows/deploy.yml`.
*   [ ] Setup the GCS bucket `gs://mywhiskey-code-graph/` and add automated upload steps to GitHub Actions.

### Phase 4: Mature Autonomous Repository
*   [ ] Refactor select large concepts into directories (e.g. `/knowledge/concepts/Booking/` containing `concept.md`, `examples.md`, etc.).
*   [ ] Build the Model Context Protocol (MCP) server for Graphify to allow query-based AST relationship retrieval.

### Phase 5: Future Knowledge Catalog Extensions
*   [ ] Integrate supplementary automated auditing tools, custom registry metadata rules, or external terminology dictionary hooks based on future team expansion.
