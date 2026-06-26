---
type: Architecture
title: "Technical Roadmap"
description: "Technology evolutions, transition plans, and architectural migrations."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Technical Roadmap

This document outlines the planned technology evolutions, migration triggers, and transition plans to scale the **MY Whiskey** platform.

---

## 1. Current State

The current platform prioritizes delivery speed and minimal operations, using:
*   **Firestore NoSQL** as the single data source.
*   **CSS variables & modules** for all component layouts.
*   **Graphify GCS JSON** for uploading static code relationship data.

---

## 2. Approved Direction

The following migrations and evolution tracks are approved for design and layout, with designated triggers:

### Storage Migration: Firestore $\rightarrow$ Relational / Hybrid SQL (PostgreSQL)
*   **Why**: Firestore's schema-less model becomes difficult for complex relational reports, accounting audits, and multi-vessel collision detection schedules.
*   **Approved Design**: Keep Firestore as the real-time scheduling edge, but replicate transactional entities (Bookings, Payments, Organizations) to a PostgreSQL database for reporting and structured query capability.
*   **Trigger**: Exceeding 10 concurrent active vessel schedules, or when operators demand custom booking invoice reports.

### UI Library Evolution: Custom Components Library
*   **Why**: Building every luxury card, drawer, and input from scratch slows down page layout iteration.
*   **Approved Design**: Establish a strict custom library of atomic UI controls under `@/components/ui/` using CSS variables and React primitives, rather than bringing in rigid external libraries.
*   **Trigger**: Starting development of the Customer Booking Portal in Phase 3.

### Code Intelligence Integration: Graphify JSON $\rightarrow$ MCP Query Layer
*   **Why**: Static JSON graphs on GCS require agents to parse huge files, causing context window blowup.
*   **Approved Design**: Introduce a Model Context Protocol (MCP) server that runs locally or as a service, allowing agents to issue semantic query requests about code structure and registry status.
*   **Trigger**: Spawning more than 3 subagents concurrently for automated features.

---

## 3. Potential Future

*   **Offline Booking Sync**: Service worker capability storing drafts locally and syncing when cellular networks connect on water.
*   **Web3 Smart Escrow**: Smart contract booking settlements for cryptopayment charters.
*   *Warning: Developer agents must NOT execute or implement any item under this section until it is migrated to an Approved Direction.*
