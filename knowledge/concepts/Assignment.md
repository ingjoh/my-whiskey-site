---
type: Concept
title: "Assignment"
description: "Dynamic allocation of a Resource to an Operational Itinerary."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Assignment

An **Assignment** represents the dynamic allocation of a **Resource** (vessel, equipment, or crew) to an **Operational Itinerary** for the execution of a charter booking.

## Properties & Naming Rules
*   Represented in the code as an `AssignmentDocument` document.
*   Uniquely identified by an assignment prefix and UUID (e.g. `id: "asg_uuid"`).
*   Belongs directly to an **Operational Itinerary** via `itineraryId`.
*   Includes `resourceId` to designate the scheduled Resource, and status (tentative, assigned, declined).

## Naming Warning
*   Do not define Assignment as a relationship linking a Person directly to a Booking role. It allocates a unified Resource to an Operational Itinerary.

## Examples

### Good Practice
*   Assigning a captain resource: `resourceId: "res_captain_sarah"` to itinerary `opit_voyage_456`.
*   Filtering active assignments: `assignments.filter(a => a.status === 'assigned')`.

### Bad Practice
*   Never store raw crew member person profiles directly in the Assignment; always reference the unified `resourceId`.
