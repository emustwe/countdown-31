"use client";

import React, { useCallback, useState } from "react";

/**
 * The background picture, COMPLETE — never cropped.
 *
 * `background-size: cover` fills a screen by throwing away whatever does not fit.
 * barnaby-field.jpg is 1024x571 (≈16:9); on a phone held upright (393x852) cover scales it to
 * 1527px wide and discards 74% of its width. That is why Barnaby was sliced in half at the left
 * edge, the scales were cut off and the arena ring was nowhere on screen.
 *
 * Three layers, bottom to top:
 *
 *   .whole-bg-fill  the same photograph, oversized, far out of focus and dimmed — so the area
 *                   around the frame is still the pasture rather than a letterbox bar
 *   .whole-bg-img   the photograph WHOLE, nothing cropped, feathered at all four edges so it
 *                   dissolves into the blur instead of sitting on it as a rectangle
 *   .whole-bg-tint  the gradient wash, over both, exactly as the single cover layer used to carry
 *
 * Three rather than one because only the filler may be blurred (`filter` on a shared parent would
 * soften the sharp copy too) and only the sharp copy may be masked (masking a shared parent would
 * eat the tint along with it).
 *
 * The sharp copy is an <img>, not a background. An <img> at `max-width/max-height: 100%` with auto
 * sizing lays out at exactly the size `contain` would paint — so the ELEMENT BOX IS THE PICTURE,
 * and a percentage mask on it feathers the picture's own edges. On a background the mask would have
 * measured the whole viewport and faded the wrong place.
 */
export function WholeImageBackdrop({
  src,
  /** A CSS gradient, painted over both layers. Pass the same one the cover version used. */
  tint,
  className = "",
}: {
  src: string;
  tint: string;
  className?: string;
}) {
  /**
   * The picture's own shape, measured from the file rather than written down here, so swapping the
   * admin-configured background cannot silently distort it.
   *
   * It is needed because `max-width/max-height: 100%` alone reproduces `contain` only up to the
   * file's natural size — on a 1440px desktop a 1024px-wide photograph just sat small in the middle.
   * Knowing the ratio lets the width be stated outright as "the full container width, or as wide as
   * the container's height allows, whichever is smaller", which is `contain` including upscaling.
   */
  const [ratio, setRatio] = useState<number | null>(null);
  /* A ref callback, not onLoad alone: a cached image can finish loading before React attaches its
     handler, and then onLoad never fires and the picture is stuck at its natural size. */
  const measure = useCallback((img: HTMLImageElement | null) => {
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) setRatio(img.naturalWidth / img.naturalHeight);
  }, []);

  return (
    <div className={`whole-bg ${className}`.trim()} aria-hidden="true">
      <div className="whole-bg-fill" style={{ backgroundImage: `url('${src}')` }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="whole-bg-img"
        src={src}
        alt=""
        ref={measure}
        onLoad={(e) => measure(e.currentTarget)}
        style={
          ratio
            ? { width: `min(100cqw, calc(100cqh * ${ratio}))`, height: "auto", maxWidth: "none", maxHeight: "none" }
            : undefined
        }
      />
      <div className="whole-bg-tint" style={{ backgroundImage: tint }} />
    </div>
  );
}
