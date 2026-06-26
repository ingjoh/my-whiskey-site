---
type: Architecture
title: "Technology Stack"
description: "Repository languages, frameworks, storage models, and SaaS provider rationales."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Technology Stack

This document details the software, platform, infrastructure, and tools utilized in the **MY Whiskey** platform, including selection rationales.

---

## 1. Current State

The active technology stack is composed of the following items:

### Core Languages
*   **TypeScript / JavaScript**: Used for all client-side and serverless backend code (Next.js App Router files). Rationale: Unified development stack, fast compile-time type verification, and native integration with the Next.js runtime.
*   **Python**: Used optionally for standalone automation scripts and specific data processing utilities.

### Web Application Frameworks
*   **Next.js 16 (App Router)** & **React 19**: Standardized routing, server components, and client-side rendering. Rationale: Hybrid SSR (Server-Side Rendering) for high SEO performance on public listings, combined with Serverless API endpoints in one unified deployment structure.
*   **Zustand**: Client-side state management. Rationale: Extremely lightweight and developer-friendly alternative to Redux, avoiding complex boilerplate while ensuring predictable reactive state.

### Storage & Data Persistence
*   **Google Cloud Firestore**: Schema-less NoSQL database. Rationale: High-availability, zero-maintenance operational model with native real-time subscriptions, perfect for rapid development of document-oriented entities like Booking details.

### Payment Processing
*   **Stripe Connect**: Multi-party payment routing. Rationale: Enables robust split-payment mechanics between the yacht operator (payment collection) and crew/partners (direct payouts) while complying with financial licensing rules.

### Communications & Delivery
*   **Telnyx API**: SMS and Voice notifications. Rationale: Carrier-grade API with low latency and global reach for real-time booking alerts and OTP verification.
*   **Resend**: Transactional email services. Rationale: Developer-centric email API with high delivery rates and modern React Email component compatibility.

### Deployment & CI/CD
*   **Firebase Hosting & Serverless Functions**: Rationale: Direct serverless compilation of Next.js App Router deployments with automatic global CDN caching.
*   **GitHub Actions**: Continuous integration pipeline running checks on PRs, running unit tests, and uploading descriptive structural graphs generated via Graphify.

---

## 2. Approved Direction

The approved decisions for the core stack are as follows:

*   **API-First Design**: All client interactions must go through Next.js Serverless Route Handlers (`/src/app/api/`) or React Server Actions. Direct client-side calls to external SaaS APIs (Telnyx, Resend) are forbidden.
*   **Vanilla CSS for Styling**: The application must rely on standard CSS Variables and CSS Modules to ensure design fidelity and absolute visual control over premium elements, preventing styling leaks common in heavyweight CSS frameworks.
*   **Secret Management**: All production secrets must be stored in Google Cloud Secret Manager or Firebase Secrets, never in plain `.env` files.

---

## 3. Potential Future

*   **Next.js self-hosted runtime on AWS/GCP (Docker/ECS)**: Moving away from Firebase Hosting if serverless runtime limitations (cold starts, execution timeouts) degrade booking latency.
*   **FastAPI backend**: Isolating heavy computational rules (yacht routing calculations, weather-matching algos) to a dedicated Python service.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
