# Tournament Sponsor Platform — Operational Runbook & Pilot Hardening

**Version:** 1.0.0  
**Target Repository:** `emustwe/countdown-31`  
**Scope:** Sponsor Studio, In-Game Tournament Sponsor Layer, Managed Assets, Cause Module, and Analytics Telemetry.

---

## 1. Core Architecture & Safety Guardrails

### 1.1 Scope Isolation
- **Tournament-Scoped Only:** Sponsor campaigns are strictly bound to individual tournament IDs (`roomId.startsWith("tour:")`).
- **Practice & Casual Immunity:** Practice games (`/game/va-practice`) and non-sponsored tournaments run exclusively on default house themes with zero sponsor assets or tracking overhead.

### 1.2 Fixed Gameplay Invariance
- Sponsor elements are displayed via a fixed overlay layer (`TournamentSponsorLayer`).
- **Forbidden Overlays:** Sponsor components **NEVER** cover, obscure, or intercept clicks on:
  1. The central number deck (1–31 grid).
  2. Player cards, avatars, and live player scores.
  3. Turn timer and countdown clocks.
  4. Game mode selector (Classic vs. Skill mode).
  5. Action buttons ("Confirm Move", "Undo", "Use Skill").
  6. Match defeat / victory modal dialogs.

### 1.3 Dual-Approval Governance Gate
- Revisions start in `DRAFT` status.
- Every revision requires independent approval from two lanes:
  - **Brand Review Lane:** Confirms visual aesthetics, logo formatting, and brand guideline compliance.
  - **Safety Review Lane:** Audits copy, claim legitimacy, HTTPS destination URL, and regulatory disclosure.
- Immediate publication or scheduled activation is blocked until **both lanes** have recorded an `APPROVED` decision.

---

## 2. Pre-Pilot Verification Checklist (Go-Live Gate)

### 2.0 Product acceptance demo

Use the built-in fictional pilot before testing a real sponsor:

1. Open `/admin/tournament` and select **Build complete demo**.
2. Open the resulting Sponsor Studio and confirm that the preview, managed asset library, analytics, and revision history load.
3. Make a harmless copy change, save a draft, and submit it for review.
4. Approve the exact revision in both the **Brand** and **Safety** lanes, then publish it.
5. Open `/events/demo-moomorrow-cup`, confirm the branded lobby, and enter the match.
6. Confirm the sponsor layer is present while the number deck, player controls, skills, timer, and result flow remain unobstructed.

The demo company and campaign are fictional and clearly labelled as test content. Rebuilding it resets its sample aggregate analytics and creates a new immutable published revision.

Before setting a sponsor tournament to `Live`, the tournament operator must check off all 8 items:

| # | Check Item | Requirement | Verification Method |
|---|---|---|---|
| 1 | **Asset Dimensions & Format** | Logo (square 1:1, PNG/MP4/WebM), Desktop BG (16:9), Mobile BG (9:16) | Upload inspector in Sponsor Studio |
| 2 | **File Size Budget** | Max 12 MB per file; sub-2MB recommended for mobile backgrounds | Upload asset inspector |
| 3 | **Disclosure & Attribution** | Mandatory disclosure label (e.g. *"Sponsored by"*) and clear sponsor name | Review live preview header badge |
| 4 | **Contrast & Readability** | Background overlay opacity between 50% and 85% to maintain number deck legibility | Visual inspection in preview |
| 5 | **Reduced Motion Support** | Logo animations (`float`, `turntable`, `pulse`) disable gracefully when system prefers reduced motion | `prefers-reduced-motion: reduce` query test |
| 6 | **Cause Module URLs (if active)** | Secure `https://` protocol only, valid public domain, clear external-site note | Automated regex validator & manual click test |
| 7 | **Schedule Window** | `activateAt` and optional `expireAt` in UTC ISO format | Review Schedule card in Studio |
| 8 | **Fallback Integrity** | Logo text fallback renders if asset URL is blocked or fails to load | Network tab asset blocking test |

---

## 3. Incident Response & Emergency Procedures

### 3.1 Severity 1: Inappropriate or Corrupted Sponsor Creative Live in Tournament
- **Impact:** Live players seeing broken visuals or unapproved branding.
- **Immediate Mitigation (30 Seconds):**
  1. Navigate to `/admin/tournament/[id]/campaign`.
  2. Click the **"Pause"** button in the sticky bottom control bar.
  3. *Alternative (API):* Send `POST /admin/promo-tournaments/:id/campaign/pause` with Admin JWT.
- **Result:** In-game client immediately reverts the tournament background and logo to the default house theme with 0 downtime for active games.

### 3.2 Severity 2: Controversial or Malfunctioning Cause CTA Link
- **Impact:** External link in cause card is down or violates community standards.
- **Immediate Mitigation (10 Seconds):**
  1. Click **"Hide cause now"** in the Sponsor Studio bottom bar.
  2. *Alternative (API):* Send `POST /admin/promo-tournaments/:id/campaign/cause/pause`.
- **Result:** Cause card disappears from desktop and mobile views while preserving active sponsor branding.

### 3.3 Severity 3: Rollback to Previously Approved Revision
- **Impact:** Need to quickly revert from an unsatisfactory live revision to a known good release.
- **Procedure:**
  1. Open the **"Immutable revision history"** panel in Sponsor Studio.
  2. Locate the prior approved revision.
  3. Click **"Restore as new revision"**.
  4. Submit and publish immediately.

---

## 4. Failure Drills & Self-Healing Behaviors

| Simulated Failure | Client Reaction | Recovery Confirmation |
|---|---|---|
| **Sponsor CDN / Asset 404** | `<SponsorLogo>` catches `onError` and displays styled `logoText` in sponsor primary color. | No broken image icons shown to players. |
| **Mobile Network Disconnect** | Telemetry buffer holds events in memory; unmount/beforeunload attempts beacon flush. | Gameplay continues with zero lag; analytics drops are non-fatal. |
| **Corrupted Video Logo** | `<video onError>` switches seamlessly to fallback image or text node. | Match canvas never crashes. |
| **Database Telemetry Spike** | Ingestion aggregate uses compound unique key upserts with daily rollups. | O(1) row footprint per placement/device bucket per day. |

---

## 5. Post-Campaign Sponsor Handoff & Proof of Performance

### 5.1 Exporting the Sponsor Performance Report
1. Open Sponsor Studio (`/admin/tournament/[id]/campaign`) or Sponsor Portal (`/sponsor`).
2. Click **"Export CSV Report"**.
3. File `campaign-report-[tournamentId].csv` downloads containing:
   - Total eligible tournament matches played.
   - Verified rendered impressions by placement (`arenaBackground`, `logoTile`, `featurePanel`, `causeCard`).
   - Active viewable dwell time (accumulated exclusively during visible tab focus).
   - Device class breakdown (Desktop vs. Tablet vs. Mobile share).
   - Interactive cause expansions, CTA clicks, and computed CTR.
   - Formal disclosure text, campaign title, and activation date ranges.

### 5.2 Delivery SLA Reassurance
All telemetry aggregates filter out bot crawlers and administrative preview sessions to guarantee authentic player impression figures.
