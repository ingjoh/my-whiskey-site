# Walkthrough - Amenities, Contacts, and Social Campaigns (Phase 2)

This document summarizes the changes made to introduce dynamic asset tagging (chips), the premium contact concierge page with API integrations, public footer layout fixes, and the Phase 2 Social Media Campaign dashboard with live calendar urgency recommendations and Facebook/Instagram publishing.

---

## 1. Asset Feature Tagging System (Chips)

Introduced a dynamic, icon-associated features/amenities tag system for fleet assets (vessels) supported in the admin panel, public profile pages, web page builder, and the print/PDF collateral generator.

* **Database & Seed ([db.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/lib/db.ts))**:
  * Implemented `VesselFeature` structure and database loaders/savers in Firestore under `settings/vessel_features`.
  * Pre-seeded 9 standard amenity chips: AC, TV, WiFi, Ice Maker, Fridge, Power, Paddle Board, Snorkeling, Fishing.
* **Admin Editor Panel ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/content/%5Btype%5D/%5Bid%5D/page.tsx))**:
  * Added a specifications manager widget allowing admins to choose active tags for each vessel, and dynamically define/register new custom tags mapped to Lucide icons.
* **Public Profile View ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/%5BpageId%5D/%5Bslug%5D/page.tsx))**:
  * Displays active asset specifications/amenities as styled gold chip badges with associated icons.
* **Web Builder Layout Blocks ([NewBlocks.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/builder/NewBlocks.tsx) & [BuilderRightPanel.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/builder/BuilderRightPanel.tsx))**:
  * Integrated amenities badges into dynamic cards/carousels with an toggle switch in the builder sidebar.
* **Print Canvas & PDF Export ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/collateral/page.tsx) & [print/page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/collateral/print/page.tsx))**:
  * Ensured print-ready templates render amenity badges when checked in the collateral layout sidebar.

---

## 2. Contact Concierge Form & Footer Layout Fix

Added a luxury contact page (`/contact`), implemented Resend API mail dispatching, and resolved contact item layout wrapping in the site footer.

* **Footer Wrapping Fix ([PublicFooter.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/public/PublicFooter.tsx))**:
  * Applied `wordBreak: 'break-all'` to Phone and Email link components to prevent long text overlapping adjacent sitemap columns.
  * Added `flexShrink: 0` and aligned icons (`alignItems: 'flex-start'`) to format multi-line text nicely.
* **Contact API Endpoint ([route.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/api/contact/route.ts))**:
  * Created `POST /api/contact` route handler parsing incoming inquiries.
  * Resolves settings dynamically using `loadSiteSettings()` to load the custom admin contact address.
  * Wraps inquiries inside `MasterEmailWrapper` and delivers the message via Resend SDK `sendEmail`.
* **Contact Client Form ([ContactFormClient.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/public/ContactFormClient.tsx))**:
  * Built a two-column responsive form matching the high-end dark background aesthetic with loading feedback and status notifications.
* **Contact Root Page ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/contact/page.tsx))**:
  * Server page mapping the global navigation bar, client contact form, and updated public footer inside a single layout.

---

## 3. Social Paid Media Module (Phase 2)

Integrated dynamic database-driven recommendations based on live calendar availability and organic Facebook/Instagram feed publishing capabilities.

* **Dynamic Strategy Recommender ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/social-ads/page.tsx))**:
  * Replaced the monthly mock check with `calculateRecommendedGoal` which scans upcoming confirmed calendar bookings for the next 30 days.
  * Suggests high-priority campaigns if an immediate weekend day (within 10 days) remains unbooked, mid-term weekend boost campaigns if weekend density is low, or weekday promo campaigns if weekday slots are vacant.
* **Facebook Graph API Credentials ([db.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/lib/db.ts) & [page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/social-ads/page.tsx))**:
  * Expanded the settings schema to support `fbPageToken` and `fbPageId`.
  * Added inputs in the Prompt Settings tab on the dashboard, allowing admins to save and persist Facebook developer tokens to Firestore.
* **Publishing Route Handler ([route.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/api/admin/social-ads/publish/route.ts))**:
  * Created `POST /api/admin/social-ads/publish` API endpoint verifying admin credentials and dispatching posts to Facebook's Graph API.
  * Supports text-only feeds and image posts (by parsing the bound Firebase Storage URL).
  * Automatically operates in **Simulation Mode** if credentials are mock/missing in development, printing the post payload to stdout logs and returning a successful output to prevent workflow crashes.
* **Publisher Interface ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/social-ads/page.tsx))**:
  * Replaced the "Publish Campaign" placeholder with a modal dialog popup showing validation warnings (e.g. if no media is bound, warn that it will publish as text-only), a text area to modify copy before publishing, and live status feedback alerts.

---

## 6. Standalone Top-Level Events Calendar Refactoring

Moved the Events Calendar out of the nested sub-tab in the social ads campaign planner to a standalone, universally accessible top-level dashboard in the admin portal.

* **Standalone Calendar Route ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/calendar/page.tsx))**:
  * Established the new `/admin/calendar` page, housing all holiday imports, Gemini AI event suggestion scans, custom event creations, and list tables.
* **Social Ads Dashboard Refactoring ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/social-ads/page.tsx))**:
  * Removed all nested calendar layout markup, state definitions, modals, and tab switchers.
  * Preserved Firestore loading of the `eventsList` collection to automatically feed upcoming event variables into prompt generators and strategy recommendations.
  * Added a link pointing directly to the new Calendar Dashboard in the main form context.
* **Admin Navigation Links ([page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/page.tsx))**:
  * Registered dedicated entry cards for the "Events & Holiday Calendar" under both the **CMS Workspace** and **Charter Operations Workspace** directory hubs.

---

## Verification Results

### Scratch Script Payload Verification
We wrote and executed scratch scripts (`test_edit_payloads_18.js` and `test_edit_payloads_21.js`) targeting the `imagen-3.0-capability-001` endpoint with the new structures. Both returned `200 OK` successfully:
```bash
node scratch/test_edit_payloads_18.js
=== Testing: Inpainting with RAW + MASK ===
Response status: 200 OK
SUCCESS! Got predictions.
```

### Automated Build Verification
- Ran `npm run build`. Next.js 16 (Turbopack) successfully completed type checking, static generation, page optimization, and production compilation with zero errors:
```bash
> next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 15.5s
  Running TypeScript ...
  Finished TypeScript in 24.0s ...
  Generating static pages ...
✓ Generating static pages using 15 workers (45/45) in 1219ms
  Finalizing page optimization ...
```
* **Social Ads Integration**: Page load dynamically retrieves calendar events from Firestore and incorporates active dates into campaign recommendations.

---

## 8. Staging and Production Deployments

* Pushed updated codebases containing the standalone calendar manager and refactored social ads planner.
* Merged `main` changes into `staging` to trigger automated Vercel deployment builds.

---

## 9. Vertex AI Imagen 3 - AI Ad Creator

Integrated the professional AI Ad Creator sandbox directly inside the Vertex AI Image Studio dashboard, giving marketing teams the ability to generate print-ready luxury ad creatives from a base image.

* **UI Mode Tab ([AIImageEditor.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/admin/AIImageEditor.tsx))**:
  * Added a dedicated `'create-ad'` tab to the Vertex AI sandbox interface.
  * Disables canvas mouse-drawing mask features and sets the mouse cursor to a standard pointer when the Ad Creator tab is active.
* **State Management**:
  * Configured state variables for the campaign's `adCopy` (pre-populated from the current mockup campaign copy), `systemPrompt` (guiding high-end graphic design parameters), `userPrompt` (for custom text placement/overlay guidelines), and `adAspectRatio` (output ratios: `1:1`, `16:9`, `9:16`).
* **Payload Generation**:
  * Programmatically creates a solid white mask of the reference image dimensions using an offscreen `<canvas>` buffer.
  * Combines the system prompt, ad copy, and user instructions into a single unified design instruction.
  * Automatically routes the payload to the `/api/admin/ai/image` endpoint with `action: 'edit'`, `editMode: 'inpainting-insert'`, and `aspectRatio: adAspectRatio`, enabling the Vertex AI Imagen model to recreate the scene with custom overlays.

## Verification & Build

* **Dynamic Style & Brand Guide Integration**:
  * **Settings Configuration**: Added the `brandSystemPrompt` property to `SiteSettings` inside [db.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/lib/db.ts) and created the **Brand Guidelines** input textarea in the settings dashboard [page.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/admin/settings/page.tsx).
  * **Dynamic Prompts Assembly**: Configured [AIImageEditor.tsx](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/components/admin/AIImageEditor.tsx) to load settings and generate a detailed system prompt combining company name, hex color swatches, rectangular/square logo image URLs, and the saved custom brand design rules.
* **Build compilation**: Ran `npm run build` to verify type safety and layout integrity across Next.js 16 App Router compilation, resulting in a clean successful build:
  ```bash
  ✓ Compiled successfully in 12.6s
  Finished TypeScript in 29.2s ...
  ✓ Generating static pages using 15 workers (45/45) in 1526ms
  ```

---

## 10. Meta Ad Account Campaign Fix & Vercel Sync

To resolve campaign creation failures due to API v24+ validation policies, we added budget sharing settings:

* **Meta API parameters**: Added `is_adset_budget_sharing_enabled: false` to the campaign creation request body in [publish/route.ts](file:///c:/Users/ingem/MY%20Whiskey%20-%20Site/src/app/api/admin/social-ads/publish/route.ts). This is required when campaign budgets are set at the individual ad set level rather than sharing across the campaign.
* **Deployment Sync**: Merged changes into both the `main` and `staging` branches and pushed them to origin. This triggers concurrent automated deployment builds on Vercel for both staging and production environments to keep them fully aligned.
* **Build validation**: Ran `npm run build` locally, verifying zero typescript or compilation errors before pushing the updates.

