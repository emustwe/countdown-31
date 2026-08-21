import { describe, it, expect } from "vitest";
import { CountdownGameService } from "./countdown.service";

// Two team definitions for an influencer (team-battle) knockout room.
const TA = { name: "Alpha", color: "#5aa8ff" };
const TB = { name: "Bravo", color: "#ff6b7f" };

function newSvc(): CountdownGameService {
  const s = new CountdownGameService();
  s.setBroadcaster(() => {}); // no-op; we read state via getState()
  return s; // NB: we don't call onModuleInit(), so no real tick interval runs
}

// Real tournaments have no CPU fillers, so seat several real players (alternating teams). The first
// joiner carries the team defs + optional start time.
function seat(s: CountdownGameService, room: string, n: number, startAt?: number): void {
  for (let i = 0; i < n; i++) {
    const team = i % 2 === 0 ? TA : TB;
    const cos = i === 0 ? { team, teams: [TA, TB], ...(startAt !== undefined ? { startAt } : {}) } : { team };
    s.join(room, `H${i}`, `Human ${i}`, cos);
  }
}

// A non-consecutive pick (skip) instantly eliminates the current player.
function eliminateCurrent(s: CountdownGameService, room: string): void {
  const st = s.getState(room);
  s.submit(room, st.currentId!, [st.count + 2]);
}
// A safe, legal advance for a player we want to KEEP alive (avoids repeat + never says 31).
function safeAdvance(s: CountdownGameService, room: string): void {
  const st = s.getState(room);
  const m = [1, 2, 3].find((k) => k !== st.lastK && st.count + k <= 30) ?? 1;
  s.submit(room, st.currentId!, Array.from({ length: m }, (_, j) => st.count + 1 + j));
}

describe("knockout tournament rules", () => {
  it("an eliminated player cannot rejoin (may still spectate)", () => {
    const s = newSvc();
    const room = "tour:spec-elim";
    seat(s, room, 6, 1); // 6 real players, start time in the past → begins now
    expect(s.getState(room).status).toBe("playing");

    const victim = s.getState(room).currentId!;
    eliminateCurrent(s, room);
    let st = s.getState(room);
    expect(st.players.find((p) => p.id === victim)).toBeUndefined();
    expect(st.status).toBe("playing"); // field still has survivors

    const before = st.players.length;
    s.join(room, victim, "Human"); // attempt to rejoin → refused
    st = s.getState(room);
    expect(st.players.length).toBe(before);
    expect(st.players.find((p) => p.id === victim)).toBeUndefined();
  });

  it("a team wins as soon as it is the only team with players left (early stop)", () => {
    const s = newSvc();
    const room = "tour:spec-teamwin";
    seat(s, room, 6, 1); // 3 Alpha + 3 Bravo, begins now

    // Drive: eliminate every Bravo player, keep Alpha players alive.
    for (let i = 0; i < 300 && s.getState(room).status === "playing"; i++) {
      const st = s.getState(room);
      const cur = st.players.find((p) => p.id === st.currentId)!;
      if (cur.team?.name === TB.name) eliminateCurrent(s, room);
      else safeAdvance(s, room);
    }

    const st = s.getState(room);
    expect(st.status).toBe("over");
    expect(st.winner?.team?.name).toBe(TA.name);
    // Early stop: several Alpha players are still standing (not just a single survivor).
    expect(st.players.length).toBeGreaterThan(1);
    expect(st.players.every((p) => p.team?.name === TA.name)).toBe(true);
    // No Bravo player remains.
    expect(st.teamStandings.find((t) => t.name === TB.name)?.alive).toBe(0);
  });

  it("holds in a lobby until the scheduled start time, then is ready to begin", () => {
    const s = newSvc();
    const room = "tour:spec-lobby";
    const future = 4102444800000; // year 2100 (ms) — safely in the future
    s.join(room, "H", "Human", { team: TA, teams: [TA, TB], startAt: future });
    const st = s.getState(room);
    expect(st.status).toBe("waiting"); // lobby, not started
    expect(st.startsAt).toBe(future); // clients show a GMT countdown to this
    expect(st.currentId).toBeNull();
  });

  it("an unscheduled tournament (no start time) never auto-starts — it waits in the lobby", () => {
    const s = newSvc();
    const room = "tour:spec-unscheduled";
    s.join(room, "H", "Human", { team: TA, teams: [TA, TB] }); // deliberately no startAt
    const st = s.getState(room);
    expect(st.status).toBe("waiting"); // lobby, not playing
    expect(st.startsAt).toBeNull();
    expect(st.currentId).toBeNull();
  });

  it("begins immediately when the start time is already in the past", () => {
    const s = newSvc();
    const room = "tour:spec-paststart";
    seat(s, room, 2, 1); // 2 real players, start time 1970 → already past
    const st = s.getState(room);
    expect(st.status).toBe("playing");
    expect(st.currentId).not.toBeNull();
  });

  it("a finished knockout does not restart on a new join (no play again)", () => {
    const s = newSvc();
    const room = "tour:spec-norestart";
    seat(s, room, 6, 1); // 6 real players, begins now
    for (let i = 0; i < 300 && s.getState(room).status === "playing"; i++) {
      const st = s.getState(room);
      const cur = st.players.find((p) => p.id === st.currentId)!;
      if (cur.team?.name === TB.name) eliminateCurrent(s, room);
      else safeAdvance(s, room);
    }
    expect(s.getState(room).status).toBe("over");

    const before = s.getState(room).players.length;
    s.join(room, "late-comer", "Late", { team: TA, teams: [TA, TB] });
    const st = s.getState(room);
    expect(st.status).toBe("over"); // stays over
    expect(st.players.length).toBe(before); // no new player, no restart
  });
});
