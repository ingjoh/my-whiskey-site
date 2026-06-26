---
type: Design
title: "Component Strategy"
description: "Component reuse guidelines, separation of concerns, and atomic UI control definitions."
owner: "Design"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Component Strategy

This document establishes the reuse guidelines, composability constraints, and catalogs the core UI control library for the **MY Whiskey** platform.

---

## 1. Current State

The current codebase maintains standard modular components inside `src/components/`, including:
*   A basic layout header and footer.
*   Admin dashboard panels.
*   Basic layouts for listing vessels.
*   *Limitation*: Several forms and inputs are built ad-hoc inside page views, introducing small style variations and duplications.

---

## 2. Approved Direction

The approved design pattern enforces absolute modularity and separation of concerns:

### Component Rules
1.  **Build Once, Reuse Everywhere**: Common elements must never be duplicated across page views. Extract them into reusable component primitives.
2.  **Separate Presentation from Logic**: Presentation components under `src/components/ui/` should be purely functional and presentational, driven by props. Fetching logic and server state operations must reside in Next.js Server Page layouts or container wrapper components.
3.  **Strict Token Adherence**: Styles must reference the CSS variables defined in `globals.css` and documented in [Design System](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/design/system.md). Ad-hoc pixel measurements or off-brand hex colors are prohibited.

### UI Controls Catalog
Every developer and agent must reference and utilize the following standard control definitions under `src/components/ui/`:

*   **Button**: Text and icon button variants (Primary, Secondary, Muted, Outline) with active press states and hover glow effects.
*   **Input**: Standard text, email, and password form elements with error styling states.
*   **Select**: Accessible custom dropdown selector.
*   **Checkbox**: Standard checked and unchecked checkbox control.
*   **Tabs**: Horizontal tabbed navigation panels.
*   **Modal**: Center-aligned dialog popups with backdrop overlays.
*   **Table**: Data representation grids with luxury borders.
*   **Skeleton Loader**: Clean, animated layout skeletons for lazy-loading blocks.
*   **Date Picker**: Custom calendar booking picker to select charter ranges.

---

## 3. Potential Future

*   **Storybook Integration**: Establishing an isolated Storybook workspace to test visual style tokens and component responsive states independently.
*   **Figma-to-Code Sync**: Automated generation of CSS variables directly from official design system frames.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
