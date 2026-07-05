---
name: knowledge-impact-analysis
description: (Mandatory) Audit proposed tasks to identify affected knowledge objects in the repository
---

# Knowledge Impact Analysis Playbook

This is a **mandatory** pre-implementation check. Before writing any implementation plans or modifying source code, you must execute this analysis.

---

## 1. Analysis Workflow

1.  **Perform Knowledge Evolution Assessment**: Before planning, evaluate the conceptual boundary of the changes by answering:
    *   *Is this a genuinely new concept?*
    *   *Does this extend an existing concept?*
    *   *Which existing Knowledge Objects should be updated?*
    *   *Is a new Knowledge Object actually required?* (Only create a new object if the concept has a distinct lifecycle, ownership, or set of relationships that cannot fit as an extension).
2.  **Parse proposed task**: Identify target codebase modules (e.g., modifying bookings creation code).
3.  **Scan the Knowledge Registry**: Read [index.yaml](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/index.yaml) to locate which concepts map to those modules via the `implemented_by` fields (e.g. mapping `booking-service` to the `Booking` concept).
4.  **Map dependencies**: Check the `depends_on` array for associated concepts that might be impacted by proxy (e.g., changes to `Booking` may affect `Vessel` and `Guest`).
5.  **Output Knowledge Assessment**: Formulate the structured assessment and checklist block at the top of the implementation plan.

---

## 2. Example Output Format
Include this block at the top of your implementation plan:

### Knowledge Assessment

*   **Existing Knowledge Objects Affected**:
    *   [ ] `knowledge/concepts/Booking.md` (Owner: Domain) - *Reason: Modifying core scheduler validation.*
    *   [ ] `knowledge/concepts/Vessel.md` (Owner: Operations) - *Reason: Booking logic queries vessel slot relocation rules.*
*   **Existing Concepts Being Extended**: `Booking` (extending slot relocation rules).
*   **Genuinely New Concept Required?**: No. Slot relocation is a sub-feature of scheduling and is governed under the `Booking` and `Vessel` lifecycles.
*   **Knowledge Objects to Update**: `knowledge/concepts/Booking.md`, `knowledge/concepts/Vessel.md`.
*   **Registry Changes Required**: None.
*   **ADR Required?**: No (respects stack defined in `001-core-stack`).
*   **Recommended Documentation Updates**: Update dependency descriptions in `Booking.md` to reflect new vessel slot verification relationships.
