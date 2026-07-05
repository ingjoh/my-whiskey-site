---
type: Concept
title: "TripGallery"
description: "A guest-facing memory vault, AI travel story, and tipping ledger bound to a Booking."
owner: "Domain"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "feat/trip-gallery-tipping@HEAD"
---

# TripGallery

A **TripGallery** represents the guest-facing digital memory vault of a completed luxury yacht excursion. It is bound to a single `Booking` and aggregates the trip's media, location route tags, crew credits, AI-compositions, and a ledger for crew appreciation tips.

## Properties & Naming Rules
*   Stored in the Firestore root collection `/trip_galleries` where the document `id` is identical to the `bookingId` (e.g. `BK_123456`).
*   Must include:
    *   `bookingId`: References the parent Booking document.
    *   `tenantId`: References the Organization owning the booking.
    *   `title` and `description`: Enriched title and summary (custom or AI-suggested).
    *   `story`: The narrative text describing the trip.
    *   `media`: Array of uploaded media references containing:
        *   `url`: Public file link.
        *   `type`: `'image' | 'video'`.
        *   `caption`: AI or editor caption.
        *   `exif`: Optional object storing GPS `latitude`, `longitude`, and `capturedAt`.
    *   `isPublished`: Boolean visibility flag controlling guest page access.
    *   `tippingLedger`: An object tracking `totalTipped` (in cents) and `stripePaymentIntentIds` to ensure single-tip auditing.

## Examples

### Good Practice
*   Scope public gallery routes directly by the Booking ID: `http://localhost:3000/trip/BK_123456`.
*   Validate that only authenticated crew/captains bound to the workspace or trip assignment can write or modify the gallery document.

### Bad Practice
*   Do not nest the gallery schema inside the core Booking document; keep it decoupled in its own collection to optimize query size and guest accessibility.
