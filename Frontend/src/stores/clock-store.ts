import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * A single shared clock for everything that displays a countdown.
 *
 * The arena used to hold `useState(Date.now())` + `setInterval(…, 200)` inside CountDown31 — a
 * 975-line component whose children are unmemoized — so the whole subtree re-rendered five times a
 * second, forever. This store moves that tick out of the tree: leaves subscribe with a selector
 * that already reduces to whole seconds, so a component only re-renders when its own digit changes.
 *
 * Two deliberate properties:
 *
 *  - SELF-ALIGNING. The ticker never chains `setTimeout(fn, 1000)`, which accumulates drift. Every
 *    tick recomputes its delay from a fresh `Date.now()` so it lands on the moment the displayed
 *    digit actually changes. Aligned to the ACTIVE DEADLINE rather than the wall-clock second: what
 *    matters is when `ceil((deadline - now) / 1000)` flips, which is generally not on a wall second.
 *    With no deadline set it falls back to the wall-clock second boundary.
 *
 *  - NOT A PHASE GATE. One-shot transitions at a known timestamp (a dance freeze ending, a kickoff
 *    wheel stopping) must NOT poll this clock — a 1s tick would let them overstay by up to a second.
 *    They use an exact `setTimeout` at the deadline instead. See `useDeadlinePassed`.
 *
 * Built on the VANILLA store rather than zustand's `create()` on purpose. `create()` returns a hook
 * that closes over its own internal api object and calls `useSyncExternalStore(api.subscribe, …)`;
 * reassigning `.subscribe` on the returned hook therefore would NOT intercept React subscriptions,
 * and the ref-counting below would never run. Owning the api lets us pass the wrapped one to
 * `useStore` so every subscription — React's included — is counted.
 */

interface ClockState {
  /** Wall-clock ms, refreshed on each aligned tick. */
  now: number;
  /** The timestamp the ticker aligns its boundaries to; null → align to the wall-clock second. */
  deadline: number | null;
}

const store = createStore<ClockState>()(() => ({
  // Matches the previous `useState(() => Date.now())` exactly, so hydration behaviour is unchanged.
  now: Date.now(),
  deadline: null,
}));

/**
 * Milliseconds until the displayed value next changes.
 *
 * With a deadline, the digit is `ceil((deadline - now) / 1000)`, which changes when the remaining
 * time crosses a whole-second multiple — that is `(deadline - now) % 1000` from here. A result of 0
 * means we are exactly on a boundary, so the next one is a full second away.
 */
function nextDelay(deadline: number | null): number {
  const t = Date.now();
  if (deadline !== null && deadline > t) return (deadline - t) % 1000 || 1000;
  return 1000 - (t % 1000); // always 1…1000
}

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let subscribers = 0;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Schedule the next tick from a FRESH Date.now() — never from the previous delay. */
function realign(): void {
  clearTimer();
  timer = setTimeout(onTick, nextDelay(store.getState().deadline));
}

function onTick(): void {
  timer = null;
  // A tick can land far past its due time if the browser suspended us (background tab, throttled
  // timer, sleeping OS). That needs no special case: publishing the true `Date.now()` IS "set now
  // immediately", and `realign()` recomputes the next delay from a fresh reading rather than
  // assuming this one landed on schedule — so arbitrary lateness self-corrects on the next
  // boundary, and a deadline that expired while we were suspended is simply already past.
  store.setState({ now: Date.now() });
  if (running) realign();
}

function handleVisibility(): void {
  if (!running) return;
  if (document.visibilityState === "hidden") {
    // Nothing is on screen to update, and background timers are throttled anyway.
    clearTimer();
    return;
  }
  // Coming back: publish the true time SYNCHRONOUSLY so the first painted frame is not a stale
  // digit, then re-aim the next boundary.
  store.setState({ now: Date.now() });
  realign();
}

function start(): void {
  if (running || typeof window === "undefined") return;
  running = true;
  store.setState({ now: Date.now() });
  document.addEventListener("visibilitychange", handleVisibility);
  realign();
}

function stop(): void {
  if (!running) return;
  running = false;
  clearTimer();
  document.removeEventListener("visibilitychange", handleVisibility);
}

// Ref-count subscribers so the ticker runs only while something is actually watching it.
const baseSubscribe = store.subscribe;
const countedSubscribe: typeof store.subscribe = (listener) => {
  subscribers += 1;
  if (subscribers === 1) start();
  const unsubscribe = baseSubscribe(listener);
  let released = false;
  return () => {
    if (released) return; // React can invoke a cleanup more than once
    released = true;
    unsubscribe();
    subscribers -= 1;
    if (subscribers === 0) stop();
  };
};

/** The api handed to React — identical to the store except that subscriptions are counted. */
const api = { ...store, subscribe: countedSubscribe };

/** Subscribe to the clock. ALWAYS pass a selector that reduces to the value you actually render. */
export function useClockStore<T>(selector: (s: ClockState) => T): T {
  return useStore(api, selector);
}

/**
 * Point the ticker at the deadline being counted down (e.g. `state.turnEndsAt`).
 *
 * A plain function, not a store action, so the caller does NOT become a subscriber — CountDown31
 * needs to set this without re-rendering on the clock, which is the entire purpose of the change.
 */
export function setClockDeadline(ts: number | null): void {
  if (store.getState().deadline === ts) return; // no-op on every parent render
  // Publish a fresh `now` ALONGSIDE the new deadline. Setting the deadline alone would leave the
  // leaves deriving from whatever `now` the last boundary published — up to a second stale — so a
  // 13s turn starting 800ms after the previous tick would render ceil(13800/1000) = 14, and the
  // next tick (aligned 1000ms out) would publish 12. The clock would read 14 → 12 and skip a digit,
  // on every turn. This only runs on a real turn transition, so it costs nothing per tick.
  store.setState({ now: Date.now(), deadline: ts });
  // The boundary moved, so the pending timeout is aimed at the wrong moment — re-aim it.
  if (running) realign();
}

/**
 * Whole seconds left until `deadline`, as a SELECTOR — the component re-renders only when the digit
 * itself changes, not on every tick. Returns 0 when there is no deadline.
 *
 *   const secondsLeft = useSecondsLeft(turnEndsAt);
 *
 * KNOWN, ACCEPTED: a leaf that starts subscribing mid-turn can read a `now` up to 1s stale for one
 * render. `setClockDeadline` publishes a fresh `now` on every turn change, which covers the local
 * engine (endDance issues a new turnEndsAt), so the only live path is a SERVER TOURNAMENT resuming
 * from a dance freeze on an UNCHANGED turnEndsAt. Bounded at 1s and self-correcting at the next
 * boundary — not a bug, don't "fix" it by polling faster.
 */
export function useSecondsLeft(deadline: number | null | undefined): number {
  return useClockStore((s) =>
    deadline ? Math.max(0, Math.ceil((deadline - s.now) / 1000)) : 0,
  );
}

/**
 * Has `deadline` passed? A ONE-SHOT transition, not a poll.
 *
 * For phase gates — the cow-dance freeze ending, the kickoff wheel stopping — where being a second
 * late is visible. A single timeout fires exactly at the deadline; there is no per-second wakeup
 * and no dependency on the clock store, so the `frozen` chain stops recomputing on every tick.
 *
 * Returns false while the deadline is in the future, true once it is reached. With no deadline it
 * is always true (nothing to wait for).
 */
export function useDeadlinePassed(deadline: number | null | undefined): boolean {
  const [passed, setPassed] = useState(() => !deadline || Date.now() >= deadline);

  useEffect(() => {
    if (!deadline) {
      setPassed(true);
      return;
    }
    // Already past — on a reconnect or a late hydration the deadline can be historic, so flip now
    // rather than scheduling a negative timeout.
    if (Date.now() >= deadline) {
      setPassed(true);
      return;
    }
    setPassed(false);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => setPassed(true), Math.max(0, deadline - Date.now()));
    };
    // A suspended tab can hold a timeout well past its due time, so re-check on the way back in
    // and flip immediately instead of waiting for a timer the OS may have parked.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() >= deadline) setPassed(true);
      else arm();
    };
    arm();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadline]);

  return passed;
}
