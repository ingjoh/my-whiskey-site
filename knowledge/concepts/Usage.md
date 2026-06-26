---
type: Concept
title: "Usage"
description: "Usage events and analytics logs tracking consumed units for AI prompt tokens, generated images, emails, and SMS to facilitate billing."
owner: "Finance"
status: "Authoritative"
maturity: "draft"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Usage Logging

The **Usage** entity represents a single metered event consumed by a user or organization in the system.

## Key Properties
*   **organizationId**: The ID of the organization responsible for the cost.
*   **userId**: The user who triggered the event.
*   **type**: The type of resource consumed (e.g. `'ai_text'`, `'ai_image'`, `'ai_video'`, `'email'`, `'sms'`).
*   **provider**: The backend service API used (e.g. `'gemini'`, `'vertex_ai'`, `'resend'`, `'telnyx'`).
*   **units**: The quantitative units (e.g., token count, segment count, count of emails).
*   **costEst**: The estimated cost in USD based on wholesale API rates.
*   **timestamp**: The ISO timestamp when the resource was consumed.

## Logging Workflow
Usage records are written silently immediately after the corresponding API call succeeds. These records serve as an authoritative log for analytics and billing.
