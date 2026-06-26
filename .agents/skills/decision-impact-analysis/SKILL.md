---
name: decision-impact-analysis
description: Assess changes to core systems (Stripe, Firestore, Booking) to trace impacts on decisions (ADRs) and code systems
---

# Decision Impact Analysis Playbook

This skill is invoked alongside `knowledge-impact-analysis` whenever changes touch core systems:
*   **Booking / Proposal** flow.
*   **Stripe Connect** integrations.
*   **Firestore** database settings.
*   **Vessel / Asset** availability rules.

---

## 1. Analysis Workflow

1.  **Trace ADRs**: Locate matching decisions under `/knowledge/decisions/` referencing the core systems (e.g. check `001-core-stack.md` for Stripe or Firestore details).
2.  **Evaluate Trade-offs**: Assess if the proposed changes deviate from the decisions accepted in the ADR.
3.  **Trace Mappings**:
    *   Find which APIs, services, and tests depend on the targeted system using Graphify's structural output.
4.  **Formulate Recommendations**: If the change conflicts with an ADR, draft a proposed update to the ADR or create a new ADR (e.g., `002-stripe-split-adjustments.md`) describing the new context.
