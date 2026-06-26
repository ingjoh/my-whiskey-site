# Project Index & Entry Point

Welcome to the **MY Whiskey** codebase repository. This project is a luxury yacht charter booking engine, user portal, and administrative ad/campaign performance management dashboard.

This file serves as the main entry point and onboarding index for human developers and Google Antigravity agents.

---

## 1. Core Knowledge Catalog Index
Use these links to navigate our knowledge architecture before coding:

*   **Registry**:
    *   [index.yaml](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/index.yaml): Concept ownership, dependencies, and logical mappings.
    *   [log.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/log.md): Chronological catalog update log.
*   **Layer 1: Vision**
    *   [vision.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/vision/vision.md): Guiding principles and user experience ideals.
*   **Layer 2: Domain Ontology (Concepts)**
    *   [Booking.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/concepts/Booking.md) | [Vessel.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/concepts/Vessel.md) | [Guest.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/concepts/Guest.md) | [Payment.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/concepts/Payment.md) (Search under `/knowledge/concepts/` for others).
*   **Layer 3: Technical Design & Architecture**
    *   [system.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/design/system.md): Styling tokens, typography, and luxury aesthetics guidelines.
    *   [overview.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/architecture/overview.md): Logical boundaries, server/client SDK isolation, and GCS code maps.
    *   [ADR Index](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/decisions/README.md) / [ADR-001](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/decisions/001-core-stack.md): Architectural decisions log.
*   **Layer 4: Implementation Guardrails & Skills**
    *   [Global AGENTS.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/AGENTS.md): Root behavior policies.
    *   [Source AGENTS.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/AGENTS.md): Coding rules.
    *   [Skills Catalog](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/.agents/skills/): Scaffolding and verification playbooks.

---

## 2. Onboarding Workflow for Agents
Before generating or refactoring code, agents MUST:
1.  Read this index ([PROJECT_INDEX.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/PROJECT_INDEX.md)) to understand the stack and current risks.
2.  Read the global [AGENTS.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/AGENTS.md) to parse governance loops.
3.  Execute **Mandatory pre-implementation audits** using custom skills before writing any code.


---

## 3. Technology Stack & Deployment

*   **Frontend & Routing**: Next.js 16 (App Router) & React 19.
*   **Styling**: Vanilla CSS (and responsive Tailwind CSS utilities where integrated).
*   **Database**: Google Cloud Firestore (NoSQL).
*   **Payments**: Stripe Connect (Payment routing & splitting).
*   **Communications**: Telnyx API (SMS/Voice notifications), Resend (Email).
*   **Deployment**: Firebase Hosting (`us-central1` region) integrated with Next.js Serverless Functions backend.
*   **CI Pipeline**: Google Cloud Build runs linting, tests, and regenerates structural graph artifacts to upload to GCS.

---

## 4. Current Known Risks & Constraints

> [!WARNING]
> **Next.js 16 Breaking Changes**
> Next.js 16 introduces changes that differ from pre-trained AI datasets. Always consult `node_modules/next/dist/docs/` before implementing/modifying routing, rendering APIs, or handlers.

> [!IMPORTANT]
> **Firestore Admin vs Client Imports**
> Ensure server-side initialization (`firebase-admin`) is completely isolated from client-side imports. Mixing client/server database imports breaks Next.js route builds.

> [!IMPORTANT]
> **Meta API Authentication & Tokens**
> Social campaign publishing requires a Page Access Token with correct permissions (e.g. `pages_manage_posts`, `pages_read_user_content`). Never hardcode access tokens; use Firebase Secret Manager or secure environment variables.
