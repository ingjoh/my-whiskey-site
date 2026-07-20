---
type: Concept
title: "Resource Approval"
description: "Active operational approval for a Person to perform a role involving a Resource."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Resource Approval

A **Resource Approval** represents an operational approval certifying that a **Person** (e.g. Captain) is approved by a governing party to perform a role involving a specific **Vessel** (or other operational assets).

## Details
*   Certifies *approval* to operate, separate from raw qualifications, certificates, or resumes (which belong on the `Person` under Capabilities). A Resource Approval is explicitly **not** a qualification or certification.
*   Any operating limits (e.g. max wind speeds, daytime-only rules) must be stored in structured fields rather than free-form text to allow programmatic pre-flight checks.

## Examples

### Good Practice
*   Create a `ResourceApproval` record mapping Captain John to Vessel X, detailing operating wind speed limit parameters in a structured object: `{ "maxWindKnots": 25 }`.
*   Query active resource approvals during voyage provisioning checksheets to verify the scheduled captain is authorized for the vessel.

### Bad Practice
*   Do not record qualifications, sea logs, or captains' licenses directly inside `ResourceApproval` records; catalog them as Capabilities on the `Person` document.
*   Do not store operating limits as unstructured, free-form text sentences.

