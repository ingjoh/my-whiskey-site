---
type: Playbook
title: "Deployment & CI/CD Model"
description: "GitHub Actions verify workflows, graph generation, and deployment keys."
owner: "Operations"
status: "Authoritative"
maturity: "stable"
review_frequency: "Semi-Annually"
verified_against: "main@HEAD"
---

# Deployment & CI/CD Model

This playbook details the pipeline for deployment and automated knowledge auditing.

## 1. Local Actions
*   Developers verify code compilation before pushing: `npm run build`.
*   Developers can run graph parsing locally: `npm run generate-graph`.

## 2. GitHub Actions Pipeline
*   Triggers on pushes to `main` and `staging`.
*   Executes ESLint linting and TypeScript checking.
*   Runs `npm run generate-graph`.
*   Authenticates with Google Cloud and uploads generated `graph.json`, `graph.html`, and `GRAPH_REPORT.md` to `gs://mywhiskey-code-graph/` (staging and production only).
*   Enforces `GCP_SA_KEY` secrets for deployment uploads.
