# Pre-generated cow avatar pipeline

## Decision

The account stores one finite `variantId`. The app renders one finished image
for that ID. Players do not drag, resize, or position accessories.

Repeated text-to-image prompts are not suitable for this: seeds and reference
images reduce drift, but cannot guarantee the same face, pose, markings, crop,
or lighting. The base cow must remain pixel-identical.

## Production method

1. Approve one canonical transparent base cow at 2048 × 2048 and freeze it as
   `base/base-cow-v1.png`.
2. Record the fixed canvas, cow bounding box, eye/horn anchors, camera, pose,
   expression, and light direction.
3. Generate or paint each wearable as a transparent, canvas-aligned 2048 ×
   2048 PNG. Do not ask AI to redraw the whole cow.
4. Composite combinations offline in this order:
   `hat-back → base cow → glasses → hat-front → shared shadow/grade`.
5. Export complete WebP variants for the app and retain the PNG masters.
6. Save only the stable `variantId` on the account.

Hats may need separate back and front layers so horns can correctly pass in
front of part of the hat. This approach still produces the desired pre-baked
full images, but every output contains the exact same cow pixels.

## Suggested structure

```text
public/assets/avatar-catalog/cow-v1/
  base/base-cow-v1.png
  layers/glasses/gold-round-front.png
  layers/hats/cowboy-back.png
  layers/hats/cowboy-front.png
  renders/base.webp
  renders/glasses_gold_round.webp
  renders/hat_cowboy.webp
  renders/hat_cowboy__glasses_gold_round.webp
  manifest.json
  contact-sheet.webp
```

Example IDs:

- `base`
- `glasses_gold_round`
- `hat_cowboy`
- `hat_cowboy__glasses_gold_round`

The manifest entry should contain `id`, `image`, `label`, `hatId`,
`glassesId`, `version`, and `sha256`. Never overwrite shipped images; create
`cow-v2` when the canonical cow changes.

## AI accessory prompt

Use image editing/inpainting with the canonical image attached. Protect the
entire cow and expose only the accessory region.

```text
Edit the attached canonical Count Down 31 cow asset. Do not redraw, retouch,
move, resize, recolor, relight, or alter any existing cow pixel. Preserve the
2048x2048 canvas and exact alignment. Add only [ACCESSORY] at [ANCHOR]. Match
the existing stylized 3D lighting from upper-left. Output a transparent PNG
layer; every pixel outside the accessory and its physically necessary shadow
must have zero alpha. No background, text, crop, camera change, or pose change.
```

If the model cannot return an isolated layer, use its edited full image only
to extract the accessory. Then composite that accessory onto the untouched
canonical cow.

## Acceptance checks

- Canvas and color profile match the master.
- Outside the accessory mask, pixels exactly match the canonical cow.
- Eyes, horns, muzzle, silhouette, crop, and shadow anchors do not move.
- Transparent edges contain no white or dark fringe.
- Hat/glasses combinations have physically correct overlap.
- Review a contact sheet at both 512px and the final 96px avatar size.

## Implemented MVP

The `/avatar` page now uses the `cow-v1` catalog. It offers two simple
on/off choices (cowboy hat and glasses) and resolves them to one of four
pre-baked variant IDs. Equipping saves only that ID in the existing persisted
avatar store. `MasterAvatar` reads the same ID, so the equipped result appears
on profile and in player-card surfaces without changing game logic.

Run `npm run avatar:build` after approving a new layer. The script aligns the
source hat, composites every supported combination onto the frozen cow,
exports lossless WebP renders, and rewrites `manifest.json` with SHA-256 hashes.
The AI-generated source is retained for provenance; the browser never performs
live compositing and never asks AI to redraw the cow.
