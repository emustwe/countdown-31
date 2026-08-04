# VA (Victory Ark Gaming) brand assets

The VA tournament theme reads its art from this folder.

## In place now (from the VA_Theme_Files zips)
- `logo.png`      — VA_LOGO_illRGB.png (Victory Ark wordmark, transparent)
- `background.jpg` — the phoenix "麻将自摸 3" promo banner, used as the game-page background
- `card.jpg`       — the "VA GAMING Exclusive — Win Up to X10,000" banner, used as card art

## Still needed for a full VA board
- `symbols.png` — the 5 reel symbols as ONE 3×2 sprite sheet. The Drive's `遊戲_Game ICON` export
  we received was only a spreadsheet (`.csv`/`.xlsx`), not image files. Send the actual game-icon
  PNGs (or point me at them) and the reel symbols swap to VA art too. Until then the board keeps
  the house symbols; everything else (background, colours, logo, card, rule book) is VA.

| File (place here)      | Used for                                             | Source in the VA Drive                    |
|------------------------|------------------------------------------------------|-------------------------------------------|
| `logo.png`             | Co-brand chip on cards + tournament header + game bar | `VA_logo`                                 |
| `background.png`       | Game page background (the reel scene)                | a full-bleed image from `遊戲推廣素材_Banners` |
| `symbols.png`          | The 5 reel symbols — a **3×2 sprite sheet** (same layout as the house sheet: top row ogre/dj/slime, bottom row jackal/witch/skull positions) | best 6 icons from `遊戲_Game ICON` |
| `card.png`             | Tournament card artwork (listing + header)           | a square/banner image from `遊戲推廣素材_Banners` |

## Notes
- `symbols.png` must be a single image laid out as a 3-columns × 2-rows grid (the CSS slices it
  with `background-size: 300% 200%` and positions). If VA icons are individual files instead,
  send them and they'll be composited into one sheet.
- PNG with transparency is preferred for `logo.png` and `symbols.png`.
- Recommended sizes: `background.png` ≥ 1600×1000, `symbols.png` ≥ 900×600, `logo.png` ≥ 240px wide.
- Palette: the VA accent colour is set in one place — `--va-accent` in `dune.css` (search
  `brand-va`). It will be matched to `logo.png` once that file is added.

Adding another partner brand later: create `public/brands/<key>/`, add a `<key>` entry to
`src/lib/brands.ts`, and a `.brand-<key>` block in `dune.css`. Nothing else changes.
