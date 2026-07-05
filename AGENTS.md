<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Global Developer Agent Policies

You must strictly adhere to the following rules when working on this repository:

1.  **Read Onboarding Files First**: At the start of your turn, read [PROJECT_INDEX.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/PROJECT_INDEX.md) and this [AGENTS.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/AGENTS.md) file.
2.  **Mandatory Pre-Implementation Audit**: Before drafting any implementation plans or changing code, you MUST execute the `knowledge-impact-analysis` and `decision-impact-analysis` skills to check affected concepts and ADRs.
3.  **Knowledge & Domain Mapping**: Never invent new database entities or naming variables. Validate naming and relations against [index.yaml](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/index.yaml) and individual concepts in [concepts/](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/concepts/).
4.  **Design System Tokens**: Style rules must strictly use tokens from [system.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/design/system.md).
5.  **Technical Boundaries**: Enforce server/client boundary rules set in [overview.md](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/architecture/overview.md).
6.  **Self-Verification**: You must run `npm run build` to verify Next.js compiles with zero compiler or typescript errors before ending your turn.

---

## Knowledge Evolution

The Knowledge Catalog is the authoritative representation of the platform. To prevent the Knowledge Catalog from gradually becoming fragmented, duplicated, or inconsistent as the project grows, both human developers and Antigravity agents must follow these rules:

*   **Enrichment Over Creation**: Before creating a new Knowledge Object, determine whether the information represents a genuinely new concept or an extension of an existing concept. Always prefer enriching existing Knowledge Objects over creating new ones.
*   **Distinct Lifecycles Only**: Only introduce a new Knowledge Object when it represents a distinct business, architectural, design, operational, or engineering concept with its own lifecycle and relationships.
*   **Default to Extensions**: When uncertain, extend an existing concept rather than creating a new one.
*   **Mandatory Registration**: Every new Knowledge Object must be justified through the Knowledge Impact Analysis process and registered in the Knowledge Registry (`index.yaml`).
*   **Pre-Implementation Audits**: Knowledge Impact Analysis is required before significant implementation work.

### Definition of Done (DoD)
A task is not considered complete until all applicable checklist items below have been satisfied:
*   [ ] **Code Implementation**: Code has been implemented.
*   [ ] **Test Verification**: Tests pass.
*   [ ] **Knowledge Impact Analysis**: Completed and registered in the implementation plan.
*   [ ] **Knowledge Enrichment**: Existing Knowledge Objects have been updated where required.
*   [ ] **New Knowledge Registration**: Any new Knowledge Objects have been justified and registered in `index.yaml`.
*   [ ] **Decision Registry**: Architecture Decision Records (ADRs) have been updated if an architectural decision has changed.
*   [ ] **Health Verification**: `npm run knowledge-health` passes with 100% health status.
*   [ ] **Build Verification**: `npm run build` compiles with zero compiler or TypeScript errors.

## Frontend UX Rules

*   **Toast Notifications**: Never use browser-default `alert(...)` (except for destructive warnings like delete prompts). Use standard luxury dark toast notifications with local state handlers:
    - Success messages background color: `#708C84`
    - Error messages background color: `#EF4444`
    - Position: `fixed`, `top: 20px`, `right: 20px`, `zIndex: 9999`
