# Mobile Architecture Guidelines & Constraints

This document outlines the visual and runtime policies for `/apps/mobile`.

## 1. React Native New Architecture Constraint
*   **Version Baseline**: Expo SDK 57 / React Native 0.86.0.
*   **Constraint**: The project compiles under the **React Native New Architecture** (Fabric renderer and TurboModules).
*   **Dependency Audits**: Any new native packages or dependencies **must** be verified for New Architecture compatibility before adoption. Pure Javascript packages require no special checks.
*   **Installation Command**: Always use:
    ```bash
    npx expo install <package-name>
    ```
    This ensures that the Expo CLI installs versions that are compatible with the current SDK 57 set.

## 2. Declarative Visual Design Primitives
*   Avoid adding inline layout styling or hardcoded color parameters to individual screens.
*   Compose screens using token-driven Restyle primitives:
    *   `<Box>`: Layout stacked container.
    *   `<Text>`: Tokenized typography wrapper.
*   Utilize standardized visual state components (`LoadingState`, `EmptyState`, `ErrorState`, `OfflineState`, `AccessDeniedState`) to handle error reporting uniformly.
