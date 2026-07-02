---
type: ADR
title: "ADR-006: Unified Resource Scheduling Model"
description: "Rules governing resource abstraction, the inventory capacity ledger, and concurrency integrity rules."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# ADR-006: Unified Resource Scheduling Model

## Status
Accepted

## Context
The platform manages various schedulable entities including vessels, gear, and crew personnel. Initially, these were scheduled using separate structures (e.g., staff rosters, asset availability calendars, and blackout arrays). To scale multi-tenant operations, we need a unified capacity management system that prevents conflicting allocations under concurrent scheduling attempts.

## Decision
We adopt a **Unified Resource Scheduling Model** governed by the following architectural principles:

1.  **Unified Resource Abstraction**: All schedulable entities—whether physical assets (yachts, water toys) or personnel (captains, chefs)—are modeled as **Resources**.
2.  **Unified Capacity Ledger**: All resource capacity consumption (dynamic assignments, bookings, maintenance, private use, reservation holds) is recorded in a single transaction ledger: the `/inventory_allocations` collection.
3.  **Atomic Scheduling Concurrency**: All writes to the capacity ledger must be atomic operations. Conflicting allocations for a given resource during overlapping time windows (`startAt` and `endAt` ISO timestamps) must be rejected. The system must verify that zero allocation overlaps exist within a database transaction before committing any new allocation.
4.  **Operational vs. Commercial Separation**: 
    *   *Commercial availability* is evaluated by comparing offer structures against listing configurations and scheduling thresholds.
    *   *Operational availability* is evaluated by querying the unified capacity ledger for conflicts.
5.  **Capability-Based Verification**: Human resource assignments (type: `'crew'`) are allocated to itineraries based on certified **Capabilities** (e.g., `'captain'`, `'chef'`), keeping authorization Roles decoupled from operational execution.

## Consequences
*   **Inventory Integrity**: Prevents double-booking of high-value vessels and crew resources under concurrent requests.
*   **Decoupled Architecture**: Keeps scheduling logic technology-agnostic at the conceptual layer, allowing implementation via Firestore transactions, relational locks, or optimistic control.
