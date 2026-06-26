---
name: update-knowledge
description: Automatically update affected OKF concepts and register changes in the update log
---

# Update Knowledge Playbook

Use this skill after executing code changes to synchronize documentation and update validation markers.

---

## 1. Update Workflow

1.  **Locate Concept Files**: Map the modified codebase areas back to their corresponding OKF files under `/knowledge/`.
2.  **Edit Concept Metadata**:
    *   Update the `verified_against` frontmatter field with the latest git commit hash (e.g. `verified_against: "main@<commit_hash>"`).
    *   Review and modify the concept body to reflect the new implementation details.
3.  **Update Log**: Append a new entry under `knowledge/log.md` detailing:
    *   Action taken.
    *   Concepts modified.
    *   Commit reference.
    *   Author.
4.  **Registry Verification**: Run consistency checks to ensure all links remain intact.
