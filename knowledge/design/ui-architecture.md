---
type: Design
title: "UI Architecture"
description: "UI rendering philosophy, visual layout systems, accessibility standards, and custom library constraints."
owner: "Design"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# UI Architecture

This document details the interface guidelines, component philosophies, rendering strategies, and styling frameworks that support the premium aesthetic of the **MY Whiskey** platform.

---

## 1. Current State

The active user interface uses:
*   **Custom React Components**: Isolated UI components built directly in the repository to guarantee absolute styling control.
*   **CSS Modules**: Component-level style scopes (`*.module.css`) to prevent style leaks across different pages.
*   **CSS Variables**: Core theme variables (colors, spacing, typography) defined globally in `/src/app/globals.css`.
*   **Interactive Libraries**:
    *   `lucide-react`: Lightweight, clean vector icons.
    *   `@dnd-kit`: Drag-and-drop mechanics for campaign builder ordering panels.

---

## 2. Approved Direction

The approved guidelines for front-end rendering and component implementation include:

### Custom Rendering & Component Ownership
*   To deliver a premium, luxury-focused visual design (glassmorphism, clean gold accents, custom typography pairings), we avoid heavyweight third-party component libraries (such as Material UI or standard Bootstrap setups).
*   **Internal Component Repository**: All atomic interactive blocks must be declared under `src/components/ui/` as reusable custom primitives.
*   *Soften Framework Note*: While custom component styling is the primary path to maintain absolute design fidelity, this decision will be reviewed periodically as the codebase expands, evaluating if lightweight frameworks can speed up secondary admin views without compromising aesthetics.

### Layout & Accessibility Standards
*   **Grid Layouts**: Layout structures must align to the CSS variables defined in [Design System](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/knowledge/design/system.md).
*   **Accessible Markup**: Ensure all custom inputs, buttons, and dialogs contain explicit `aria-*` tags and support keyboard navigation.
*   **Aesthetic Polish**: Use transitions and animations defined in `globals.css` (`--transition-normal`) to create a fluid, responsive feeling during user interactions.

---

## 3. Potential Future

*   **Tailwind CSS Integration**: Integrating Tailwind utilities exclusively for layout speed, if requested and validated without impacting bundle load times.
*   **Custom WebGL Yacht Previews**: Embedding dynamic 3D WebGL rendering modules for vessel cabin configuration.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
