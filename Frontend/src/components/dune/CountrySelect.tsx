"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe, Search, X } from "lucide-react";
import { countryFlag, countryName, countryOptions } from "../../lib/countries";

/**
 * Country picker used by sign-up, the practice name gate and Settings.
 *
 * A native <select> was wrong here for three reasons, all of which this replaces:
 *  - 249 options is unusable as a flat native list on a phone;
 *  - the native dropdown scrolled the PAGE behind it instead of just the list;
 *  - type-ahead matched the option TEXT, which began with the flag emoji — so pressing "P" never
 *    jumped to Pakistan.
 *
 * So: a panel that scrolls inside itself (overscroll-behavior: contain pins the page), a search box,
 * and an A–Z rail that jumps straight to a letter.
 *
 * The panel is PORTALED to <body> and positioned `fixed` against the trigger's box. Absolutely
 * positioning it inside the control put it inside the arena name gate — a modal card with its own
 * `overflow-y: auto` — where it was clipped to the card on desktop and painted over the card's own
 * title and name field on a landscape phone. A portal escapes both the clipping and the stacking
 * context, and lets the panel be measured against the viewport rather than its parent.
 *
 * On a SHORT viewport (a phone in landscape is ~440px tall) there is no room to hang a list off the
 * control without burying whatever is behind it, so the picker becomes a centred SHEET with its own
 * backdrop instead — a deliberate full-screen step rather than a dropdown covering the dialog.
 */
export function CountrySelect({
  value,
  onChange,
  variant = "form",
  id,
  required = false,
  placeholder = "Select your country",
}: {
  value: string;
  onChange: (code: string) => void;
  /** "form" = signup/settings field; "gate" = the compact arena name-gate control. */
  variant?: "form" | "gate";
  id?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const all = useMemo(() => countryOptions(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // On a landscape phone the viewport is ~440px tall, so a panel opening downward can fall below the
  // fold and force the player to scroll the page to reach the list. Open upward when there is more
  // room above, and cap the list to whatever room there actually is.
  // Viewport-space geometry for the portaled panel, recomputed whenever it could have moved.
  const [box, setBox] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    max: number;
    /** true = centred sheet with a backdrop (short screens); false = dropdown anchored to the control. */
    sheet: boolean;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on an outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      // The panel lives in a portal, so it is NOT inside rootRef — check it separately.
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Place the panel against the trigger, in viewport space. Re-run on scroll/resize so it tracks
  // the control instead of drifting away from it.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      const GAP = 6;
      const EDGE = 8;
      // Everything in the panel that is NOT the scrolling list: the search row, border and padding.
      const CHROME = 66;
      const vh = window.innerHeight;

      // Too short to hang a usable list off the control without covering what is behind it.
      if (vh < 560) {
        const width = Math.min(420, window.innerWidth - EDGE * 2);
        const top = Math.round(vh * 0.06);
        // Sheet mode adds a titled header above the search row, so it reserves more than CHROME.
        const SHEET_CHROME = CHROME + 44;
        setBox({
          left: Math.round((window.innerWidth - width) / 2),
          width,
          top,
          // Bottom edge must land inside the viewport: top + chrome + list <= vh - top.
          max: Math.max(120, vh - top * 2 - SHEET_CHROME),
          sheet: true,
        });
        return;
      }

      const below = vh - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      const up = below < 190 && above > below;
      const max = Math.max(120, Math.min(300, (up ? above : below) - CHROME));
      const width = Math.min(Math.max(r.width, 240), window.innerWidth - EDGE * 2);
      const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - width - EDGE);
      setBox(
        up
          ? { left, width, bottom: vh - r.top + GAP, max, sheet: false }
          : { left, width, top: r.bottom + GAP, max, sheet: false },
      );
    };
    measure();
    setQuery("");
    const t = window.setTimeout(() => {
      const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
      el?.scrollIntoView({ block: "center" });
    }, 0);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Name-prefix matches first, then anything containing the query — so "pa" leads with Pakistan and
  // Panama rather than burying them under "Japan".
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    const starts = all.filter((c) => c.name.toLowerCase().startsWith(q));
    const rest = all.filter((c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q));
    return [...starts, ...rest];
  }, [all, query]);

  /** The letters actually present in the list, for the A–Z rail. */
  const letters = useMemo(() => {
    const seen = new Set<string>();
    for (const c of shown) seen.add(c.name[0]!.toUpperCase());
    return [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((l) => seen.has(l));
  }, [shown]);

  /** Jump to the first country starting with `letter` — scrolls the LIST, never the page. */
  function jumpTo(letter: string) {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    if (el && listRef.current) {
      listRef.current.scrollTop = el.offsetTop - listRef.current.offsetTop;
    }
  }

  function pick(code: string) {
    onChange(code);
    setOpen(false);
  }

  const selectedName = value ? countryName(value) : "";
  let lastLetter = "";

  return (
    <div className={`cs-root cs-${variant}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="cs-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cs-trigger-face">
          {value ? (
            <span className="player-flag cs-trigger-flag">{countryFlag(value)}</span>
          ) : (
            <Globe size={16} className="cs-trigger-globe" />
          )}
          <span className={value ? "cs-trigger-name" : "cs-trigger-ph"}>{selectedName || placeholder}</span>
        </span>
        <ChevronDown size={16} className={`cs-chev ${open ? "is-open" : ""}`} />
      </button>

      {/* Mirrors the value for native form validation, since the control itself is a button. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="cs-validity"
          required
          value={value}
          onChange={() => undefined}
        />
      )}

      {open &&
        box &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Sheet mode gets a backdrop so it reads as a deliberate step, and so a tap anywhere
                outside it closes the picker. */}
            {box.sheet && <div className="cs-backdrop" onClick={() => setOpen(false)} />}
            <div
              className={`cs-panel ${box.sheet ? "is-sheet" : ""}`}
              role="listbox"
              ref={panelRef}
              style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom }}
            >
              {box.sheet && (
                <div className="cs-sheet-head">
                  <span>Select your country</span>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                    <X size={16} />
                  </button>
                </div>
              )}
          <div className="cs-search">
            <Search size={14} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              aria-label="Search country"
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) {
                  e.preventDefault();
                  pick(shown[0].code);
                }
              }}
            />
            {query && (
              <button type="button" className="cs-clear" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="cs-body">
            {/* overscroll-contain lives on .cs-list: scrolling to either end stops there instead of
                handing the scroll to the page behind the panel. */}
            <div className="cs-list" ref={listRef} style={{ maxHeight: box.max }}>
              {shown.length === 0 && <div className="cs-empty">No country matches “{query}”</div>}
              {shown.map((c) => {
                const letter = c.name[0]!.toUpperCase();
                const isFirstOfLetter = !query && letter !== lastLetter;
                if (isFirstOfLetter) lastLetter = letter;
                return (
                  <button
                    type="button"
                    key={c.code}
                    role="option"
                    aria-selected={c.code === value}
                    data-selected={c.code === value}
                    data-letter={isFirstOfLetter ? letter : undefined}
                    className={`cs-opt ${c.code === value ? "is-selected" : ""}`}
                    onClick={() => pick(c.code)}
                  >
                    <span className="player-flag cs-opt-flag">{c.flag}</span>
                    <span className="cs-opt-name">{c.name}</span>
                    <span className="cs-opt-code">{c.code}</span>
                  </button>
                );
              })}
            </div>

            {/* A–Z rail: tap a letter to jump to it. Hidden while searching (the list is already short). */}
            {!query && (
              <div className="cs-az" aria-hidden="true">
                {letters.map((l) => (
                  <button type="button" key={l} className="cs-az-l" onClick={() => jumpTo(l)} tabIndex={-1}>
                    {l}
                  </button>
                ))}
              </div>
              )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
