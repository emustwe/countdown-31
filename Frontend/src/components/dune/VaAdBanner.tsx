"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

// Victory Ark Gaming home page.
const VA_SITE = "https://www.va-game.com/en#top";
// The "VA GAMING Exclusive Game" promo banner first, then the 5 real VA home banners.
const ADS = ["ad-6", "ad-1", "ad-2", "ad-3", "ad-4", "ad-5"].map((n) => `/brands/va/ad-slides/${n}.jpg`);
const AD_COUNT = ADS.length;
const INTERVAL = 4500;

/**
 * Sliding VA advertising carousel shown inside VA tournaments. Auto-advances through the VA
 * banners and links out to VA's site — the tournament doubles as an ad.
 */
export function VaAdBanner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % AD_COUNT), INTERVAL);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="glass va-ad-wrap">
      <a className="va-ad" href={VA_SITE} target="_blank" rel="noopener noreferrer" aria-label="Victory Ark Gaming">
        <span className="va-ad-track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {ADS.map((src) => (
            <span key={src} className="va-ad-slide" style={{ "--img": `url(${src})` } as React.CSSProperties} />
          ))}
        </span>
        <span className="va-ad-cta">
          <ExternalLink size={15} />
          Play at Victory Ark Gaming
        </span>
        <span className="va-ad-dots">
          {ADS.map((_, n) => (
            <i key={n} className={n === i ? "on" : ""} />
          ))}
        </span>
      </a>
    </div>
  );
}
