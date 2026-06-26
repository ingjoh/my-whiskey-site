---
name: knowledge-impact-analysis
description: (Mandatory) Audit proposed tasks to identify affected knowledge objects in the repository
---

# Knowledge Impact Analysis Playbook

This is a **mandatory** pre-implementation check. Before writing any implementation plans or modifying source code, you must execute this analysis.

---

## 1. Analysis Workflow

1.  **Parse proposed task**: Identify target codebase modules (e.g., modifying bookings creation code).
2.  **Scan the Knowledge Registry**: Read [index.yaml](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/index.yaml) to locate which concepts map to those modules via the `implemented_by` fields (e.g. mapping `booking-service` to the `Booking` concept).
3.  **Map dependencies**: Check the `depends_on` array for associated concepts that might be impacted by proxy (e.g., changes to `Booking` may affect `Vessel` and `Guest`).
4.  **Output Impact Checklist**: Formulate a checklist of concepts and system documentation files that need to be reviewed or updated.

---

## 2. Example Output Format
Include this checklist at the top of your implementation plan:
```markdown
### Knowledge Objects Affected
*   [ ] `knowledge/concepts/Booking.md` (Owner: Domain) - *Reason: Modifying core scheduler validation.*
*   [ ] `knowledge/concepts/Vessel.md` (Owner: Operations) - *Reason: Booking logic queries vessel slot relocation rules.*
```
