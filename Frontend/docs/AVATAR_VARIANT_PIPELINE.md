# Static cow avatar pipeline

## Decision

Every supported appearance is a complete, independently approved static image.
The browser never positions a hat, glasses, or another accessory over a cow.
It only maps a stable `variantId` to one finished image file.

This deliberately favors a correct visual fit over pixel-identical cows across
variants. AI may slightly change the character while fitting an item, so every
finished scenario must be reviewed before it enters the catalog.

## Implemented catalog

```text
public/assets/avatar-catalog/cow-v1/
  source/base-cow-v1.png
  source/static-glasses.png
  source/static-cowboy.png
  source/static-cowboy-glasses.png
  source/daisy-*.png
  source/rusty-*.png
  source/nova-*.png
  source/luna-*.png
  source/moss-*.png
  renders/cow_v1_base.webp
  renders/cow_v1_glasses_static_v2.webp
  renders/cow_v1_cowboy_static_v2.webp
  renders/cow_v1_cowboy_glasses_static_v2.webp
  manifest.json
```

The catalog contains 24 approved looks: Champion, Daisy, Rusty, Nova, Luna,
and Moss each have Classic, Glasses, Cowboy Hat, and Hat + Glasses renders. The `/avatar`
page resolves the cow and accessory buttons to one of these stable IDs.
Equipping persists only the ID. `MasterAvatar` uses the same finished file
in the account button, profile, and player-card surfaces.

Daisy is intentionally family-friendly: every render uses the same modest,
long-sleeved, high-collar farm dress and a neutral torso silhouette.
Luna follows the same rule with a loose, long-sleeved, high-collar space dress.

## Background and frame skins

`src/lib/avatar-decorations.ts` defines the decoration catalog. It adds ten
new background skins and ten new frame skins alongside the original themes.
These decorations are code-rendered gradients, borders, and glows, so they stay
sharp at every size and do not add image downloads. The cow portrait is inset
slightly so backgrounds remain visible even when a static portrait has a baked
studio backdrop.

## Adding a scenario

1. Start from the closest already-approved full render.
2. Ask the image editor to fit the new item to the character anatomy.
3. Generate a complete square render, never an accessory layer.
4. Use either verified transparency or an intentional collection backdrop. Do
   not accept accidental checkerboards or background-removal damage.
5. Review the fit at full size and at the final small avatar size.
6. Save the approved PNG in `source/` and add its stable ID to the manifest build.
7. Run `npm run avatar:build` to optimize the static PNGs and update hashes.

The build script only resizes and converts approved full images to lossless
WebP. It contains no accessory coordinates and performs no compositing.

## Acceptance checks

- Glasses cover both eyes and do not sit on the nostrils or mouth.
- Hats follow the head and horn anatomy without floating.
- The face, muzzle, and important expression remain unobstructed.
- Transparent renders have clean alpha; backdrop renders fill every corner.
- The square crop looks balanced in the large preview and circular account icon.
- Every supported selector combination has one manifest entry and one render.
