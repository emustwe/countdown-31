import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CountdownGameService } from "./countdown.service";
import { DEFAULT_GAME_CONFIG } from "../platform-config/game-config.schema";
import type { PlatformConfigService } from "../platform-config/platform-config.service";

// The knockout room FREEZES the whole game after every elimination (the cow-dance) and spins a
// kickoff wheel before turn 1 — both resolve on the service's tick(). We drive that with fake timers.
const WHEEL = 6600; // > WHEEL_MS (6500)
const DANCE = 8300; // > DANCE_MS (8150)

const services: CountdownGameService[] = [];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const s of services.splice(0)) s.onModuleDestroy();
  vi.useRealTimers();
});

function newSvc(): CountdownGameService {
  const config = {
    getGameConfig: () => structuredClone(DEFAULT_GAME_CONFIG),
    onGameConfigChange: () => () => {},
  } as unknown as PlatformConfigService;
  const s = new CountdownGameService(config);
  s.setBroadcaster(() => {}); // no-op; we read state via getState()
  s.onModuleInit(); // starts the 300ms tick that resolves the wheel / dance / lobby
  services.push(s);
  return s;
}

// Real tournaments have no CPU fillers, so seat several real players. The first joiner carries the
// optional start time (schedules the room).
function seat(s: CountdownGameService, room: string, n: number, startAt?: number): void {
  for (let i = 0; i < n; i++) {
    const cos = i === 0 && startAt !== undefined ? { startAt } : undefined;
    s.join(room, `H${i}`, `Human ${i}`, cos);
  }
}

// A non-consecutive pick (skip) instantly eliminates the current player.
function eliminateCurrent(s: CountdownGameService, room: string): void {
  const st = s.getState(room);
  s.submit(room, st.currentId!, [st.count + 2]);
}
// A safe, legal advance for the current player (avoids repeat + never says 31).
function safeAdvance(s: CountdownGameService, room: string): void {
  const st = s.getState(room);
  const m = [1, 2, 3].find((k) => k !== st.lastK && st.count + k <= 30) ?? 1;
  s.submit(
    room,
    st.currentId!,
    Array.from({ length: m }, (_, j) => st.count + 1 + j),
  );
}

/** Run the knockout to completion, keeping whoever moves first alive and eliminating everyone else. */
function playToWinner(s: CountdownGameService, room: string): void {
  let keep: string | null = null;
  for (let i = 0; i < 800; i++) {
    const st = s.getState(room);
    if (st.status === "over") break;
    if (st.status === "waiting") { vi.advanceTimersByTime(WHEEL); continue; } // lobby → start
    if (st.danceEndsAt) { vi.advanceTimersByTime(DANCE); continue; } // let the elimination dance end
    if (st.spinEndsAt) { vi.advanceTimersByTime(WHEEL); continue; } // let the kickoff wheel land
    if (!st.currentId) { vi.advanceTimersByTime(400); continue; }
    if (keep === null) keep = st.currentId;
    if (st.currentId === keep) safeAdvance(s, room);
    else eliminateCurrent(s, room);
    vi.advanceTimersByTime(50);
  }
}

describe("knockout tournament rules", () => {
  it("an eliminated player cannot rejoin (may still spectate)", () => {
    const s = newSvc();
    const room = "tour:spec-elim";
    seat(s, room, 6, 1); // 6 real players, start time in the past → begins now
    vi.advanceTimersByTime(WHEEL); // let the kickoff wheel land
    expect(s.getState(room).status).toBe("playing");

    const victim = s.getState(room).currentId!;
    eliminateCurrent(s, room);
    vi.advanceTimersByTime(DANCE); // let the elimination dance resolve
    let st = s.getState(room);
    expect(st.players.find((p) => p.id === victim)).toBeUndefined();
    expect(st.status).toBe("playing"); // field still has survivors

    const before = st.players.length;
    s.join(room, victim, "Human"); // attempt to rejoin → refused
    st = s.getState(room);
    expect(st.players.length).toBe(before);
    expect(st.players.find((p) => p.id === victim)).toBeUndefined();
  });

  it("the last player standing wins the knockout", () => {
    const s = newSvc();
    const room = "tour:spec-lastone";
    seat(s, room, 6, 1); // 6 real players, begins now
    playToWinner(s, room);

    const st = s.getState(room);
    expect(st.status).toBe("over");
    expect(st.players.length).toBe(1);
    expect(st.winner).not.toBeNull();
    expect(st.winner!.id).toBe(st.players[0]!.id);
  });

  it("holds in a lobby until the scheduled start time", () => {
    const s = newSvc();
    const room = "tour:spec-lobby";
    const future = 4102444800000; // year 2100 (ms) — safely in the future
    s.join(room, "H", "Human", { startAt: future });
    const st = s.getState(room);
    expect(st.status).toBe("waiting"); // lobby, not started
    expect(st.startsAt).toBe(future); // clients show a GMT countdown to this
    expect(st.currentId).toBeNull();
  });

  it("an unscheduled tournament (no start time) never auto-starts — it waits in the lobby", () => {
    const s = newSvc();
    const room = "tour:spec-unscheduled";
    s.join(room, "H", "Human"); // deliberately no startAt
    const st = s.getState(room);
    expect(st.status).toBe("waiting"); // lobby, not playing
    expect(st.startsAt).toBeNull();
    expect(st.currentId).toBeNull();
  });

  it("begins immediately when the start time is already in the past", () => {
    const s = newSvc();
    const room = "tour:spec-paststart";
    seat(s, room, 2, 1); // 2 real players, start time 1970 → already past
    vi.advanceTimersByTime(WHEEL);
    const st = s.getState(room);
    expect(st.status).toBe("playing");
    expect(st.currentId).not.toBeNull();
  });

  it("a finished knockout does not restart on a new join (no play again)", () => {
    const s = newSvc();
    const room = "tour:spec-norestart";
    seat(s, room, 6, 1); // 6 real players, begins now
    playToWinner(s, room);
    expect(s.getState(room).status).toBe("over");

    const before = s.getState(room).players.length;
    s.join(room, "late-comer", "Late");
    const st = s.getState(room);
    expect(st.status).toBe("over"); // stays over
    expect(st.players.length).toBe(before); // no new player, no restart
  });
});
