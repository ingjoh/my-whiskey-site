---
type: Concept
title: "Blog"
description: "A business marketing content node (article, news, update) supporting draft, scheduled, and published lifecycle states."
owner: "Marketing"
status: "Authoritative"
maturity: "draft"
review_frequency: "Quarterly"
verified_against: "main@HEAD"
---

# Blog

A **Blog** post (or **Article**) represents a marketing content asset published on the site to drive search traffic, user engagement, and booking conversions.

## Key Properties
*   **slug**: A URL-safe unique identifier (e.g. `destin-boating-guide-crab-island`).
*   **status**: One of `'draft'`, `'scheduled'`, or `'published'`.
*   **publishDate**: The target date for publication (YYYY-MM-DD format).
*   **content**: Markdown-formatted detailed article text.
*   **heroImage**: A lead image representing the article.

## Lifecycle States
1.  **Draft**: Editable in the admin panel; not visible on the public route.
2.  **Scheduled**: Associated with a future `publishDate`. Automatically transitioned to `published` by a daily cron.
3.  **Published**: Visible on the public blog listing and detail pages.
