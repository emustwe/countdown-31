"use client";

import { useEffect, useState } from "react";

/** Live D/H/M/S parts remaining until `iso`, ticking every second. `done` once time is up. */
function useCountdownParts(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: ms <= 0,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Split-flap / flip-clock countdown (matches the "vector clock counter" design): each unit is a
 * dark rounded card with a big number split by a centre line, and a gold label beneath. Leading
 * zero units are hidden (a 5-minute timer shows MIN·SEC; a multi-day one shows DAYS·HRS·MIN·SEC).
 */
export function FlipCountdown({ iso, size = "md", live = false }: { iso: string; size?: "sm" | "md"; live?: boolean }) {
  const { days, hours, minutes, seconds } = useCountdownParts(iso);

  const units: [string, number][] = [];
  if (days > 0) units.push(["DAYS", days]);
  if (days > 0 || hours > 0) units.push(["HRS", hours]);
  units.push(["MIN", minutes]);
  units.push(["SEC", seconds]);

  return (
    <div className={`flip-clock flip-${size} ${live ? "live" : ""}`} role="timer" aria-label="Countdown">
      {units.map(([label, value]) => (
        <div className="flip-unit" key={label}>
          <div className="flip-digit">
            <span>{pad(value)}</span>
          </div>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
