---
type: Design System
title: "Design System"
description: "Brand colors, luxury aesthetic tokens, typography pairs, and layout spacing metrics."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Design System

The visual style is designed to deliver a luxury aesthetic matching high-end yacht charters.

---

## 1. Current State

The active styling tokens defined in `/src/app/globals.css` include:

### Color Palette Tokens
*   **Primary (Brand Gold)**: `--color-primary: #d97706` (warm amber/whiskey).
*   **Primary Hover**: `--color-primary-hover: #b45309`.
*   **Background (Light Mode)**: `--color-background: #ffffff`.
*   **Surface (Light Mode)**: `--color-surface: #f8fafc`.
*   **Foreground (Light Mode)**: `--color-foreground: #0f172a`.
*   **Muted (Light Mode)**: `--color-muted: #64748b`.
*   **Border (Light Mode)**: `--color-border: #e2e8f0`.
*   **Background (Dark Mode)**: `--color-background: #0a0a0a`.
*   **Surface (Dark Mode)**: `--color-surface: #171717`.
*   **Foreground (Dark Mode)**: `--color-foreground: #ededed`.
*   **Muted (Dark Mode)**: `--color-muted: #a1a1aa`.
*   **Border (Dark Mode)**: `--color-border: #27272a`.

### Typography Pairs
*   **Heading Font**: `--font-heading` (`Outfit`, `Inter`, sans-serif) - bold, editorial headers.
*   **Body Font**: `--font-sans` (`Inter`, sans-serif) - clean, highly readable UI text.
*   **Heading Styles**: Letter spacing set to `-0.02em` or `-0.01em` on large headings.

### Spacing Grid
*   `--spacing-1` = `0.25rem` (4px)
*   `--spacing-2` = `0.5rem` (8px)
*   `--spacing-3` = `0.75rem` (12px)
*   `--spacing-4` = `1.0rem` (16px)
*   `--spacing-6` = `1.5rem` (24px)
*   `--spacing-8` = `2.0rem` (32px)
*   `--spacing-12` = `3.0rem` (48px)
*   `--spacing-16` = `4.0rem` (64px)

### Border Radius
*   `--radius-sm` = `0.25rem` (4px)
*   `--radius-md` = `0.5rem` (8px)
*   `--radius-lg` = `1.0rem` (16px)
*   `--radius-xl` = `1.5rem` (24px)
*   `--radius-full` = `9999px`

### Shadows & Glow Effects
*   `--shadow-sm` = `0 1px 2px 0 rgb(0 0 0 / 0.05)`
*   `--shadow-md` = `0 4px 6px -1px rgb(0 0 0 / 0.1)`
*   `--shadow-lg` = `0 10px 15px -3px rgb(0 0 0 / 0.1)`
*   `--shadow-glow` = `0 0 20px rgba(217, 119, 6, 0.3)`

### Transitions
*   `--transition-fast` = `150ms cubic-bezier(0.4, 0, 0.2, 1)`
*   `--transition-normal` = `300ms cubic-bezier(0.4, 0, 0.2, 1)`

---

## 2. Approved Direction

The approved design system direction includes:

*   **Luxury Dark Mode Default**: The app encourages dark-mode-first styling by default (`[data-theme="dark"]` / media query overrides) to emphasize the warm whiskey primary color.
*   **Glow Effects**: Interactive hover elements (buttons, selection borders) should layer the `--shadow-glow` variable to create a premium lighting effect.
*   **No Raw Styling Customizations**: Any layout styling must build on top of these design tokens to prevent visual drift.

---

## 3. Potential Future

*   **Dynamic Theme Switcher**: Standardized animated dark/light toggle component.
*   **Tailwind Sync Tokens**: Export script mapping these CSS variables directly to Tailwind config presets.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
