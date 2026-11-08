# Arena v2 — preview link

**https://vera31.com/home?arena=v2**

That is the link to hand out whenever "arena version 2" comes up. It is live on the
production host, but it is **not** what a normal visitor sees: v2 only switches on when
the flag is present.

## How the flag works

`Frontend/src/lib/arena-skin.ts`

| URL | Effect |
|---|---|
| `vera31.com/home?arena=v2` | turns v2 on **and remembers it for the tab** |
| `vera31.com/home?arena=v1` | turns it back off |
| `vera31.com/home` | whatever the tab last had |

It is stored in `sessionStorage` under `vera31:arena-skin`, not `localStorage` — deliberately.
It has to survive `/home → /join → /home` (clicking PLAY navigates), and it must **not**
outlive the tab, so closing the tab returns you to the normal arena. Clearing it is
therefore just: close the tab, or visit `?arena=v1`.

The flag is read in an effect, never during render — these are client components but they
still server-render, and reading the URL or storage during render is a hydration mismatch.

## What v2 changes

- The current-player detail card at the arc's apex is **gone**; everything it showed moved
  into the top row of the arena list.
- The list panel is **560 × 640** stage units (v1: 300 × 580) and sits nudged 7 units right,
  because the bowl's centre is not the stage's midline.
- Rows are **portrait + name only** — no "CPU", no cow title, no turn arrow.
- Portraits are **squares** (118px hero, 84px for the rest), showing the real avatar faces.
- The hero name auto-fits: `clamp(18, 465 / glyph-count, 40)` px, so no name is ever truncated.
- The `⚡ ACTIVE TURN` badge is **out of the flow** (absolutely positioned above the name), so
  the name sits level with the centre of its portrait.
- Every player is in the list and the list **scrolls** — no "+N more".
- Entering practice holds on a loading animation for **3.5s** before the game starts
  (`V2_ENTRY_MS` in `Frontend/src/app/home/page.tsx`).

## Not gated behind the flag

One fix shipped for everyone, because it was a plain bug rather than a design: closing the
sign-in prompt used to drop a guest into the practice game. `Frontend/src/components/AuthGuard.tsx`
now returns them to `/lobby`.

## Still open

- Whether v2 becomes the default and the `?arena=v2` flag is removed.
- The hero name's size follows the name's length, so it changes from turn to turn. If that
  movement is unwanted, every hero name can instead be fixed at one size that fits the
  longest player in the room.
