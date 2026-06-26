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

