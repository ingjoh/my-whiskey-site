---
type: Architecture
title: "Technical Roadmap"
description: "Technology evolutions, transition plans, and dynamic capability tracks of the Tuamotu Platform."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Technical Roadmap

This roadmap structures the technology migrations, triggers, and product capability tracks of the Tuamotu Platform.

---

## 1. Platform Foundation (Completed)

The core primitives of the Tuamotu Platform have been established, tested, and validated as stable:
*   **Platform Kernel**: Authoritative, globally addressable business truth models (Identity, Commercial, Operations, Finance).
*   **Workspace boundary**: Coordination of governance, participants, and dynamic bindings.
*   **Context Resolution Engine**: Reusable context resolutions supporting participant perspectives.
*   **Workspace Shell & Module Registry**: Reusable client shell components and decoupled module mapping registry.
*   **Clients & Modules**: Thin, presentation-only client wrappers (Operator, Participant views) and decoupled collaboration modules (Chat, Calendar, Voting, Budget).

---

## 2. Technical Evolutions & Triggers

The following infrastructure migrations are approved for layout and design when designated triggers are met:

### Storage Migration: Firestore $\rightarrow$ Relational / Hybrid SQL (PostgreSQL)
*   **Why**: Firestore's schema-less model becomes difficult for complex relational reports, accounting audits, and multi-vessel collision detection schedules.
*   **Approved Design**: Keep Firestore as the real-time scheduling edge, but replicate transactional entities (Bookings, Payments, Organizations) to a PostgreSQL database for reporting and structured query capability.
*   **Trigger**: Exceeding 10 concurrent active vessel schedules, or when operators demand custom booking invoice reports.

### UI Library Evolution: Custom Components Library
*   **Why**: Building every luxury card, drawer, and input from scratch slows down page layout iteration.
*   **Approved Design**: Establish a strict custom library of atomic UI controls under `@/components/ui/` using CSS variables and React primitives, rather than bringing in rigid external libraries.
*   **Trigger**: Exceeding 3 distinct client application views in the repository.

### Code Intelligence Integration: Graphify JSON $\rightarrow$ MCP Query Layer
*   **Why**: Static JSON graphs on GCS require agents to parse huge files, causing context window blowup.
*   **Approved Design**: Introduce a Model Context Protocol (MCP) server that runs locally or as a service, allowing agents to issue semantic query requests about code structure and registry status.
*   **Trigger**: Spawning more than 3 subagents concurrently for automated features.

---

## 3. Capability Development (Future Product Tracks)

With the Platform Foundation stabilized as v1.0, future tracks will focus on composing new business product capabilities rather than modifying the underlying platform layers:

*   **Marketplace**: Discovery of vessels, listings, and instant commercial offer generations.
*   **AI Concierge**: AI assistant workspace client parsing dynamic context and aiding trip schedules.
*   **Itinerary Composer**: Interactive drag-and-drop itinerary visual planners bound to operational vessel schedules.
*   **Proposal Engine**: Unified customer trip proposal drafts, pricing splits, and charter contracts.
*   **Financial Collaboration**: Ledger adjustments, connect Stripe accounts, and payouts.
*   **Partner Marketplace**: Coordination and scheduling of local concierges, ground transport, and provisioners.
*   **Crew Marketplace**: Crew licensing, assignment logs, and vessel availability schedules.
