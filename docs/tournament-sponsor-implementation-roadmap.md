# Tournament Sponsor Platform — Testable Delivery Roadmap

This roadmap turns the sponsor-platform design into small vertical slices. Every chunk ends in a usable, reviewable state and leaves normal practice games unchanged.

## Chunk 1 — Campaign foundation and live demo ✅ Implemented

- Store versioned campaign drafts per tournament.
- Give admins a visual Sponsor Studio with a clearly labelled hypothetical Nike demo preset.
- Save, publish, pause, and resume a campaign.
- Show only published campaigns in their own tournament games.
- Add a sponsor disclosure, animated identity tile, optional tournament background, and desktop story panel without moving gameplay controls.
- Fall back to the normal arena whenever a campaign is missing, paused, invalid, or unavailable.

**Human test:** create or choose a tournament, open Sponsor Studio, load the demo, publish it, launch that tournament, then pause it and confirm the normal arena returns. Confirm practice mode never changes.

## Chunk 2 — Managed asset library and placement controls ✅ Implemented

- Upload and signature-validate transparent logos, backgrounds, short video/animation assets, and mobile crops.
- Resolve managed media across localhost, LAN, and Tailscale API origins.
- Add desktop/mobile placement visibility, animation presets, responsive background selection, previews, immutable replacement history, and automatic text/house fallbacks.

**Human test:** build a campaign entirely from uploaded sponsor files and verify desktop/mobile fallbacks.

## Chunk 3 — Cause and fundraising module ✅ Implemented

- Add optional cause messaging, beneficiary details, manually managed targets/progress, and HTTPS calls to action.
- Keep cause UI outside turn-critical controls with a compact mobile treatment and instant admin disable/restore.
- Add clear external-site disclosure, bounded copy, currency controls, and safe link validation.

**Human test:** enable and disable a cause card during a staged tournament without affecting gameplay.

## Chunk 4 — Review, approval, scheduling, and rollback

- Add explicit reviewer roles, comments, approval gates, scheduled activation, expiry, and one-click rollback.
- Lock published revisions and preserve a complete audit trail.

**Human test:** move a campaign from draft to approval to scheduled live, then roll back safely.

## Chunk 5 — Sponsor analytics and reports

- Record viewable impressions and safe engagement events by placement and device.
- Add admin dashboards, delivery pacing, anomaly warnings, and exportable sponsor reports.

**Human test:** run a staged match and reconcile the dashboard/export with known test events.

## Chunk 6 — Pilot hardening

- Accessibility, performance budgets, content security, moderation, failure drills, and device-matrix QA.
- Operational runbook and sponsor handoff checklist.

**Human test:** complete the release checklist and a simulated asset/API outage before a real sponsor pilot.

## Guardrails used in every chunk

- Campaigns are tournament-scoped; practice and unrelated tournaments are isolated.
- Sponsor surfaces never cover the number deck, player cards, timer, skills, or result actions.
- Admins choose validated presets and fields—never arbitrary CSS or scripts.
- “Sponsored by” or equivalent disclosure remains visible whenever sponsor presentation is active.
- Missing or failed campaign data always falls back to the house game experience.
