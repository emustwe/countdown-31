"use client";

/**
 * Formerly added 112px of scroll height so iOS Safari would collapse its bars.
 *
 * THAT GAP WAS THE BUG. Scrolling into it exposed an empty strip that covered the game and swallowed
 * touches, and no amount of painting, flooring or layer-promotion fixed it — because the strip was
 * not a rendering artefact, it was the gap itself. It is gone.
 *
 * Consequence, stated plainly: on iOS there is now no way to hide Safari's bars. Apple exposes no
 * Fullscreen API for page content, and the scroll trick was the only alternative. The game is laid
 * out to the visible area instead, which it already did correctly. Android is unaffected — it has
 * real fullscreen, offered by the entry screen's Next button and the fullscreen control.
 *
 * Kept as a no-op component so the pages that mount it do not need touching, and so this note stays
 * attached to the decision.
 */
export function FullBleedPage() {
  return null;
}
