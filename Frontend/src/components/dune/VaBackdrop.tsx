"use client";

// One rotating VA advertising background for the whole VA tournament page — the images fade and
// zoom out one after another (like the Victory Ark home screen). The glass cards on top let this
// single backdrop show through. Uses the real VA GAMING banners from the shared collection.
const SLIDES = [1, 2, 3, 4, 5];
const CYCLE = 8; // seconds each slide is featured

export function VaBackdrop() {
  return (
    <div className="va-backdrop" aria-hidden="true">
      {SLIDES.map((n, i) => (
        <span
          key={n}
          className="va-slide"
          style={{
            backgroundImage: `url(/brands/va/slides/slide-${n}.jpg)`,
            animationDelay: `${-i * CYCLE}s`,
          }}
        />
      ))}
      <span className="va-backdrop-veil" />
    </div>
  );
}
