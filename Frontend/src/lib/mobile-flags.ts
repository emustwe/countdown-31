/**
 * ════════════════════════════════════════════════════════════════════════════
 *  THE REVERT SWITCH — change `true` to `false` and rebuild. That is all.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * true  (new)  After one swipe hides Safari's bars, the page LOCKS so they cannot be scrolled back.
 *              The arrow disappears once they are gone, and returns on a reload or when you come
 *              back from another app — the moments the bars return anyway.
 *
 * false (now)  Exactly today's behaviour: swipe up whenever you like, scroll back whenever you like,
 *              arrow always on screen.
 *
 * Nothing else changes either way. Flipping this back cannot break anything else.
 */
export const ONE_WAY_COLLAPSE = true;

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  THE MENU SKIN SWITCH — change `true` to `false` and rebuild. That is all.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * true  (new)  The lobby menu is an arcade stack: chunky extruded slabs with a hard bottom edge
 *              that presses in when tapped, outlined arcade lettering, one column upright and two
 *              in landscape. Theme colours throughout — gold for Play, deep pasture green for the
 *              rest.
 *
 * false (old)  Exactly today's lobby: the flat wrapping board of rounded tiles.
 *
 * This adds ONE class (`is-gameskin`) to the launcher. Every new rule is scoped behind it, so the
 * old look is untouched underneath and flipping back cannot affect anything else — not the game,
 * not the collapse behaviour, not the admin-configured menu entries, which still drive both skins.
 */
export const GAME_MENU_SKIN = true;
