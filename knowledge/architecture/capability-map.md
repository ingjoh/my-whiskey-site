---
type: Architecture
title: "Platform Capability Map"
description: "A mental model of how future business products and capability components compose existing platform abstractions."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Platform Capability Map

This diagram maps the layered architectural primitives of the Tuamotu Platform, showing how future business capabilities and client experiences compose the unified platform foundations.

```mermaid
graph TD
    subgraph Clients["1. Workspace Clients (Interaction Layer)"]
        Operator["Operator Workspace Client"]
        Participant["Participant Workspace Client"]
        Broker["Broker Workspace Client"]
        AICoord["AI Coordinator Client"]
    end

    subgraph Shell["2. Orchestration Shell"]
        WorkspaceShell["Workspace Shell Layout"]
        ModuleRegistry["Workspace Module Registry"]
    end

    subgraph Modules["3. Collaboration Modules"]
        Chat["Chat Module"]
        Calendar["Calendar Module"]
        Voting["Voting Module"]
        Budget["Budget Module"]
    end

    subgraph Resolution["4. Runtime Context Resolution"]
        ContextResolutionEngine["Context Resolution Runtime"]
    end

    subgraph Collaboration["5. Collaboration Core"]
        Workspace["Workspace"]
        Memberships["Memberships"]
        Bindings["Bindings"]
    end

    subgraph Kernel["6. Platform Kernel (Business Truth)"]
        Identity["Identity Domain (Person, Org)"]
        Commercial["Commercial Domain (Listing, Offer)"]
        Operational["Operational Domain (Booking, Vessel)"]
        Financial["Financial Domain (Ledger, Settlement)"]
    end

    subgraph Capabilities["7. Business Capabilities (Product Tracks)"]
        Marketplace["Marketplace Engine"]
        ItineraryComposer["Itinerary Composer"]
        ProposalEngine["Proposal Engine"]
        FinancialCollab["Financial Collaboration"]
        PartnerMarket["Partner Marketplace"]
    end

    Clients --> WorkspaceShell
    WorkspaceShell --> ModuleRegistry
    ModuleRegistry --> Modules
    WorkspaceShell --> ContextResolutionEngine
    ContextResolutionEngine --> Collaboration
    Collaboration --> Kernel
    
    Capabilities -.-> Clients
    Capabilities -.-> Collaboration
```
