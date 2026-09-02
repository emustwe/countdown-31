import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { itemKeysForLook, isBasicItem } from "../../common/shop-items";
import { AuditService } from "../../common/audit/audit.service";
import { AuthThrottleService } from "../../common/auth-throttle/auth-throttle.service";
import { encryptSecret, decryptSecret } from "../../common/crypto/secret-box";
import type { Prisma, SponsorTournament } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface SponsorTokenPayload {
  sub: string; // sponsor id
  typ: "sponsor";
  name: string;
}

type Visibility = "PUBLIC" | "PRIVATE";

export interface AdminCreatePromoInput {
  title?: string;
  description?: string;
  visibility?: string;
  type?: string; // REGULAR | GROUP
  durationDays?: number | string | null; // GROUP: total days incl. the final day
  startAt?: string | null;
  startDate?: string | null; // GMT date; time comes from user votes
  timeOptions?: string[]; // ["14:00","18:00"] GMT slots
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number | string;
  minPlayers?: number | string | null;
  maxPlayers?: number | string | null;
  seekingSponsor?: boolean;
  sponsorId?: string | null;
  themeId?: string | null;
}
export interface SponsorCreatePromoInput {
  title?: string;
  description?: string;
  type?: string;
  durationDays?: number | string | null;
  startAt?: string | null;
  startDate?: string | null;
  timeOptions?: string[];
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number | string;
  minPlayers?: number | string | null;
  maxPlayers?: number | string | null;
}
export interface UpdatePromoInput extends AdminCreatePromoInput {
  status?: string;
}
export interface InquiryInput {
  type?: string;
  tournamentId?: string | null;
  tournamentRef?: string;
  name?: string;
  email?: string;
  message?: string;
  userId?: string | null;
}

// ---- Generators -------------------------------------------------------------------------------
function genUsername(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "sponsor";
  return `${base}-${randomBytes(2).toString("hex")}`;
}
function genPassword(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}
function genCode(prefix: string): string {
  // e.g. JOIN-9F3A2B1C — easy to read out / share, hard to guess.
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
// Exactly 31 players per group in a GROUP tournament (the last group may hold fewer).
const GROUP_SIZE = 31;

// Standard include for reading a promo tournament with its sponsor, entry count, and group summary.
const PROMO_INCLUDE = {
  sponsor: { select: { id: true, name: true } },
  _count: { select: { entries: true } },
  groups: {
    orderBy: [{ isFinal: "asc" }, { index: "asc" }],
    include: { _count: { select: { members: true } } },
  },
} satisfies Prisma.SponsorTournamentInclude;

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly throttle: AuthThrottleService,
  ) {}

  // ---- Admin: sponsor accounts ----------------------------------------------------------------
  /**
   * Create a sponsor account. Username and password are optional — if omitted they are generated.
   * The password is stored as an argon2 hash (for login) AND encrypted-at-rest (so the admin can
   * view/manage it later).
   */
  async createSponsor(
    name: string,
    username?: string,
    password?: string,
  ): Promise<{ id: string; name: string; username: string; password: string }> {
    const clean = (name || "").trim();
    if (!clean) throw new BadRequestException("Sponsor name is required");

    const uname = await this.resolveUsername(username, clean, null);
    const pass = this.resolvePassword(password);

    const sponsor = await this.prisma.sponsor.create({
      data: { name: clean, username: uname, passwordHash: await argon2.hash(pass), passwordEnc: encryptSecret(pass) },
    });
    return { id: sponsor.id, name: sponsor.name, username: uname, password: pass };
  }

  /** Admin edit of a sponsor — change name, username, password and/or status. */
  async updateSponsor(
    id: string,
    patch: { name?: string; username?: string; password?: string; status?: string },
  ) {
    const existing = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Sponsor not found");

    const data: Prisma.SponsorUpdateInput = {};
    if (patch.name !== undefined) {
      const n = patch.name.trim();
      if (!n) throw new BadRequestException("Sponsor name cannot be empty");
      data.name = n;
    }
    if (patch.username !== undefined && patch.username.trim() !== existing.username) {
      data.username = await this.resolveUsername(patch.username, existing.name, id);
    }
    if (patch.password !== undefined && patch.password !== "") {
      if (patch.password.length < 6) throw new BadRequestException("Password must be at least 6 characters");
      data.passwordHash = await argon2.hash(patch.password);
      data.passwordEnc = encryptSecret(patch.password);
    }
    if (patch.status !== undefined) {
      if (patch.status !== "ACTIVE" && patch.status !== "BANNED") throw new BadRequestException("Invalid status");
      data.status = patch.status;
    }
    const updated = await this.prisma.sponsor.update({ where: { id }, data });
    return { id: updated.id, name: updated.name, username: updated.username, status: updated.status };
  }

  private async resolveUsername(requested: string | undefined, name: string, selfId: string | null): Promise<string> {
    let uname = (requested || "").trim().toLowerCase();
    if (uname) {
      if (!USERNAME_RE.test(uname)) {
        throw new BadRequestException("Username must be 3–30 chars: letters, numbers, . _ -");
      }
      const clash = await this.prisma.sponsor.findUnique({ where: { username: uname } });
      if (clash && clash.id !== selfId) throw new ConflictException("That username is already taken");
      return uname;
    }
    // Generate a unique one.
    uname = genUsername(name);
    for (let i = 0; i < 5 && (await this.prisma.sponsor.findUnique({ where: { username: uname } })); i++) {
      uname = genUsername(name);
    }
    return uname;
  }

  private resolvePassword(requested: string | undefined): string {
    const p = (requested || "").trim();
    if (!p) return genPassword();
    if (p.length < 6) throw new BadRequestException("Password must be at least 6 characters");
    return p;
  }

  async listSponsors() {
    const sponsors = await this.prisma.sponsor.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tournaments: true } } },
    });
    return sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      username: s.username,
      // Admin-visible password (decrypted). Empty for legacy sponsors created before this was stored.
      password: decryptSecret(s.passwordEnc),
      status: s.status,
      tournamentCount: s._count.tournaments,
      createdAt: s.createdAt,
    }));
  }

  async deleteSponsor(id: string): Promise<void> {
    await this.prisma.sponsor.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("Sponsor not found");
    });
    this.audit.record("SPONSOR_DELETE", { detail: { sponsorId: id } });
  }

  // ---- Sponsor auth ---------------------------------------------------------------------------
  async login(
    username: string,
    password: string,
  ): Promise<{ token: string; sponsor: { id: string; name: string; username: string } }> {
    const uname = (username || "").trim().toLowerCase();
    // Same DB-backed per-account lockout as player login, so sponsor accounts aren't a softer
    // credential-stuffing target.
    await this.throttle.assertNotLocked("sponsor", uname);
    const sponsor = await this.prisma.sponsor.findUnique({ where: { username: uname } });
    // Constant-ish work whether or not the sponsor exists (avoid user enumeration).
    const ok = sponsor ? await argon2.verify(sponsor.passwordHash, password || "") : false;
    if (!sponsor || !ok || sponsor.status !== "ACTIVE") {
      await this.throttle.recordFailure("sponsor", uname);
      this.audit.record("SPONSOR_LOGIN_FAILURE", { actor: uname });
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.throttle.recordSuccess("sponsor", uname);
    this.audit.record("SPONSOR_LOGIN_SUCCESS", { actor: sponsor.id });
    const payload: SponsorTokenPayload = { sub: sponsor.id, typ: "sponsor", name: sponsor.name };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: "12h",
    });
    return { token, sponsor: { id: sponsor.id, name: sponsor.name, username: sponsor.username } };
  }

  async verifyToken(token: string): Promise<SponsorTokenPayload> {
    const payload = await this.jwt.verifyAsync<SponsorTokenPayload>(token, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
    if (payload.typ !== "sponsor") throw new UnauthorizedException();
    return payload;
  }

  async me(sponsorId: string) {
    const s = await this.prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!s) throw new NotFoundException();
    return { id: s.id, name: s.name, username: s.username };
  }

  // ---- Input parsing (shared) -----------------------------------------------------------------
  private reqTitle(title: string | undefined): string {
    const clean = (title || "").trim();
    if (!clean) throw new BadRequestException("Tournament name is required");
    return clean.slice(0, 80);
  }
  private parseVisibility(v: string | undefined): Visibility {
    if (v === undefined || v === "PUBLIC") return "PUBLIC";
    if (v === "PRIVATE") return "PRIVATE";
    throw new BadRequestException("visibility must be PUBLIC or PRIVATE");
  }
  private parseDate(v: string | null | undefined): Date | null {
    if (v === undefined || v === null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid date/time");
    return d;
  }
  private parseWinnerCount(v: number | string | undefined): number {
    if (v === undefined || v === null || v === ("" as unknown)) return 1;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new BadRequestException("Number of winners must be a whole number ≥ 1");
    return Math.min(n, 1000);
  }
  /** Optional non-negative integer player count (min/max participants). */
  private parseCount(v: number | string | null | undefined): number | null {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new BadRequestException("Player counts must be whole numbers ≥ 0");
    return Math.min(n, 1_000_000);
  }
  private parsePrize(v: string | undefined): string {
    return (v || "").trim().slice(0, 120);
  }
  private parseType(v: string | undefined): "REGULAR" | "GROUP" {
    return v === "GROUP" ? "GROUP" : "REGULAR";
  }
  /** GROUP tournament length in days (incl. the final). Null for non-group or when unset. */
  private parseDurationDays(v: number | string | null | undefined): number | null {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new BadRequestException("Duration must be a whole number of days ≥ 1");
    return Math.min(n, 366);
  }
  /** Entry closes 24h before start for GROUP tournaments; REGULAR entry closes at startAt. */
  private entryCloseAt(type: "REGULAR" | "GROUP", startAt: Date | null): Date | null {
    if (!startAt) return null;
    return type === "GROUP" ? new Date(startAt.getTime() - 24 * 60 * 60 * 1000) : startAt;
  }
  /** Validate a list of "HH:MM" GMT time slots (deduped, sorted, max 8). */
  private parseTimeOptions(v: string[] | undefined): string[] {
    if (!Array.isArray(v)) return [];
    const re = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const set = new Set<string>();
    for (const raw of v) {
      const s = (raw || "").trim();
      if (re.test(s)) set.add(s);
      if (set.size >= 8) break;
    }
    return [...set].sort();
  }
  /** Resolve the effective start datetime from the admin's GMT date + the winning time slot.
   *
   * TIE-BREAK STRATEGY: the slot with the MOST votes wins. If two (or more) slots are tied on votes,
   * the EARLIEST time wins. This is deterministic and predictable (players always know the rule up
   * front), and it favours starting the tournament sooner — anyone who preferred a later slot is
   * still available at the earlier time, whereas the reverse isn't guaranteed. With zero votes, the
   * earliest offered slot is used as the default.
   */
  private computeStartAt(startDate: Date | null, timeOptions: string[], votes: { timeSlot: string }[]): Date | null {
    if (!startDate) return null;
    let slot: string | null = null;
    if (timeOptions.length) {
      const tally = new Map<string, number>();
      for (const v of votes) if (timeOptions.includes(v.timeSlot)) tally.set(v.timeSlot, (tally.get(v.timeSlot) ?? 0) + 1);
      // Walk slots EARLIEST-first and keep the running best only on a STRICTLY higher count, so a
      // tie is decided in favour of the earlier time.
      let best = -1;
      for (const opt of [...timeOptions].sort()) {
        const c = tally.get(opt) ?? 0;
        if (c > best) { best = c; slot = opt; }
      }
    }
    const [hh, mm] = (slot ?? "00:00").split(":").map((x) => Number(x));
    return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), hh || 0, mm || 0, 0, 0));
  }
  private async uniqueCode(prefix: string, field: "sponsorCode" | "joinCode"): Promise<string> {
    let code = genCode(prefix);
    for (let i = 0; i < 6 && (await this.prisma.sponsorTournament.findUnique({ where: { [field]: code } as never })); i++) {
      code = genCode(prefix);
    }
    return code;
  }

  // ---- Promo tournaments: create / edit / delete ----------------------------------------------
  /** Admin creates a tournament. PRIVATE ones get a sponsorCode (for a sponsor to claim) and a
   * joinCode (for users to join); PUBLIC ones may be attributed to a sponsor. Always APPROVED. */
  async createByAdmin(input: AdminCreatePromoInput) {
    const visibility = this.parseVisibility(input.visibility);
    const min = this.parseCount(input.minPlayers);
    const max = this.parseCount(input.maxPlayers);
    if (min !== null && max !== null && max < min) throw new BadRequestException("Max players cannot be less than min players");
    const type = this.parseType(input.type);
    const durationDays = type === "GROUP" ? this.parseDurationDays(input.durationDays) : null;
    const startDate = this.parseDate(input.startDate);
    const timeOptions = this.parseTimeOptions(input.timeOptions);
    const startAt = startDate ? this.computeStartAt(startDate, timeOptions, []) : this.parseDate(input.startAt);
    const data: Prisma.SponsorTournamentCreateInput = {
      title: this.reqTitle(input.title),
      description: (input.description ?? "").slice(0, 500),
      visibility,
      status: "APPROVED",
      type,
      durationDays,
      startDate,
      timeOptions,
      startAt,
      entryClosesAt: this.entryCloseAt(type, startAt),
      endAt: this.parseDate(input.endAt),
      prizePool: this.parsePrize(input.prizePool),
      winnerCount: this.parseWinnerCount(input.winnerCount),
      minPlayers: min,
      maxPlayers: max,
      // "With sponsor" but none assigned yet → the tournament is seeking a sponsor (shown on the
      // Tournaments page with a "needs sponsor" indicator). Applies to any visibility now.
      seekingSponsor: !!input.seekingSponsor && !input.sponsorId,
      themeId: input.themeId ?? null,
      createdBy: "admin",
    };
    // Private tournaments always get a joinCode. A sponsorCode (for a sponsor to CLAIM the tournament
    // later) is generated for any tournament that's PRIVATE or is "finding a sponsor" (seekingSponsor)
    // — regardless of visibility — so "Find Sponsor" public tournaments get a code too.
    const wantsSponsorCode = visibility === "PRIVATE" || (!!input.seekingSponsor && !input.sponsorId);
    if (visibility === "PRIVATE") data.joinCode = await this.uniqueCode("JOIN", "joinCode");
    if (wantsSponsorCode) data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
    // A sponsor may be attached directly at creation ("Include Sponsor"), regardless of visibility.
    if (input.sponsorId) data.sponsor = { connect: { id: input.sponsorId } };
    const created = await this.prisma.sponsorTournament.create({ data, include: PROMO_INCLUDE });
    return this.serialize(created, { codes: true });
  }

  /** A sponsor creates a PUBLIC tournament; it starts PENDING until an admin approves it. */
  async createBySponsor(sponsorId: string, input: SponsorCreatePromoInput) {
    const type = this.parseType(input.type);
    const durationDays = type === "GROUP" ? this.parseDurationDays(input.durationDays) : null;
    const startDate = this.parseDate(input.startDate);
    const timeOptions = this.parseTimeOptions(input.timeOptions);
    const startAt = startDate ? this.computeStartAt(startDate, timeOptions, []) : this.parseDate(input.startAt);
    const data: Prisma.SponsorTournamentCreateInput = {
      title: this.reqTitle(input.title),
      description: (input.description ?? "").slice(0, 500),
      visibility: "PUBLIC",
      status: "PENDING",
      type,
      durationDays,
      startDate,
      timeOptions,
      startAt,
      entryClosesAt: this.entryCloseAt(type, startAt),
      endAt: this.parseDate(input.endAt),
      prizePool: this.parsePrize(input.prizePool),
      winnerCount: this.parseWinnerCount(input.winnerCount),
      minPlayers: this.parseCount(input.minPlayers),
      maxPlayers: this.parseCount(input.maxPlayers),
      createdBy: sponsorId,
      sponsor: { connect: { id: sponsorId } },
    };
    const created = await this.prisma.sponsorTournament.create({ data, include: PROMO_INCLUDE });
    return this.serialize(created, { codes: true });
  }

  /** Admin edit of any field of a tournament. */
  async updateTournament(id: string, patch: UpdatePromoInput) {
    const existing = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tournament not found");

    const data: Prisma.SponsorTournamentUpdateInput = {};
    if (patch.title !== undefined) data.title = this.reqTitle(patch.title);
    if (patch.description !== undefined) data.description = patch.description.slice(0, 500);
    if (patch.prizePool !== undefined) data.prizePool = this.parsePrize(patch.prizePool);
    if (patch.winnerCount !== undefined) data.winnerCount = this.parseWinnerCount(patch.winnerCount);
    if (patch.minPlayers !== undefined) data.minPlayers = this.parseCount(patch.minPlayers);
    if (patch.maxPlayers !== undefined) data.maxPlayers = this.parseCount(patch.maxPlayers);
    if (patch.durationDays !== undefined) data.durationDays = this.parseDurationDays(patch.durationDays);
    if (patch.seekingSponsor !== undefined) {
      data.seekingSponsor = !!patch.seekingSponsor;
      // Switching a tournament to "finding a sponsor" mints a sponsor code if it doesn't have one yet.
      if (patch.seekingSponsor && !existing.sponsorCode) data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
    }
    if (patch.startAt !== undefined) data.startAt = this.parseDate(patch.startAt);
    if (patch.endAt !== undefined) data.endAt = this.parseDate(patch.endAt);
    // Start date / time options: recompute the effective startAt from the (new) date + existing votes.
    const nextStartDate = patch.startDate !== undefined ? this.parseDate(patch.startDate) : existing.startDate;
    const nextTimeOptions = patch.timeOptions !== undefined ? this.parseTimeOptions(patch.timeOptions) : ((existing.timeOptions as string[]) ?? []);
    if (patch.startDate !== undefined) data.startDate = nextStartDate;
    if (patch.timeOptions !== undefined) data.timeOptions = nextTimeOptions;
    if ((patch.startDate !== undefined || patch.timeOptions !== undefined) && nextStartDate) {
      const votes = await this.prisma.tournamentTimeVote.findMany({ where: { tournamentId: id }, select: { timeSlot: true } });
      data.startAt = this.computeStartAt(nextStartDate, nextTimeOptions, votes);
    }
    // Whenever startAt changes, recompute the entry-close time (24h before for GROUP).
    if (data.startAt !== undefined) {
      const nextType = (patch.type !== undefined ? this.parseType(patch.type) : (existing.type as "REGULAR" | "GROUP"));
      data.entryClosesAt = this.entryCloseAt(nextType, (data.startAt as Date | null) ?? null);
    }
    if (patch.type !== undefined) data.type = this.parseType(patch.type);
    if (patch.status !== undefined) {
      if (!["PENDING", "APPROVED", "REJECTED"].includes(patch.status)) throw new BadRequestException("Invalid status");
      data.status = patch.status as "PENDING" | "APPROVED" | "REJECTED";
    }
    if (patch.sponsorId !== undefined) {
      data.sponsor = patch.sponsorId ? { connect: { id: patch.sponsorId } } : { disconnect: true };
    }
    if (patch.themeId !== undefined) {
      data.themeId = patch.themeId ?? null;
    }
    if (patch.visibility !== undefined) {
      const vis = this.parseVisibility(patch.visibility);
      data.visibility = vis;
      // Becoming private without codes yet → generate them.
      if (vis === "PRIVATE" && !existing.sponsorCode) data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
      if (vis === "PRIVATE" && !existing.joinCode) data.joinCode = await this.uniqueCode("JOIN", "joinCode");
    }
    const updated = await this.prisma.sponsorTournament.update({ where: { id }, data, include: PROMO_INCLUDE });
    return this.serialize(updated, { codes: true });
  }

  async deleteTournament(id: string): Promise<void> {
    await this.prisma.sponsorTournament.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
    this.audit.record("TOURNAMENT_DELETE", { detail: { tournamentId: id } });
  }

  /** Record the champion when the FINAL match ends (idempotent — only the first result sticks). */
  async recordTournamentWinner(id: string, winnerName: string): Promise<void> {
    await this.prisma.sponsorTournament.updateMany({
      where: { id, completedAt: null },
      data: {
        completedAt: new Date(),
        endAt: new Date(),
        winnerName: winnerName.slice(0, 120),
      },
    });
  }

  /** Admin confirms the prize was paid out → the finished tournament drops off the public screen. */
  async markPrizeDelivered(id: string) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Tournament not found");
    const updated = await this.prisma.sponsorTournament.update({
      where: { id },
      data: { prizeDelivered: true },
      include: PROMO_INCLUDE,
    });
    this.audit.record("TOURNAMENT_PRIZE_DELIVERED", { detail: { tournamentId: id } });
    return this.serialize(updated, { codes: true });
  }

  async setStatus(id: string, status: "APPROVED" | "REJECTED") {
    this.audit.record("TOURNAMENT_STATUS", { detail: { tournamentId: id, status } });
    return this.prisma.sponsorTournament.update({ where: { id }, data: { status } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
  }

  // ---- Promo tournaments: listing -------------------------------------------------------------
  /** Admin — every tournament, with codes + entry counts. */
  async listAll() {
    const rows = await this.prisma.sponsorTournament.findMany({
      orderBy: { createdAt: "desc" },
      include: PROMO_INCLUDE,
    });
    return rows.map((t) => this.serialize(t, { codes: true }));
  }

  /** Public — approved tournaments (PUBLIC and PRIVATE) for the user Tournaments page (no codes).
   * Private ones are listed so players can find them, but joining still needs the referral code.
   * Every approved tournament stays listed until the admin marks its prize delivered (or deletes it). */
  async listApproved() {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: {
        status: "APPROVED",
        // Every admin-posted APPROVED tournament is LISTED as soon as it's created and stays up until
        // the admin marks the prize delivered (or deletes it) — we do NOT hide by start time.
        // Finished ones remain visible with a "Watch winner" state. (Both PUBLIC and PRIVATE show;
        // private just can't be JOINED without their referral code.)
        prizeDelivered: false,
      },
      orderBy: { createdAt: "desc" },
      include: PROMO_INCLUDE,
    });
    return rows.map((t) => this.serialize(t, { codes: false }));
  }

  /** A sponsor's own tournaments: ones they created (public) + private ones they've claimed. */
  async listForSponsor(sponsorId: string) {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: { sponsorId },
      orderBy: { createdAt: "desc" },
      include: PROMO_INCLUDE,
    });
    // A sponsor may see codes for the private tournaments they run (to share the joinCode).
    return rows.map((t) => this.serialize(t, { codes: true }));
  }

  // ---- Sponsor: claim a private tournament by its sponsor code ---------------------------------
  async claimByCode(sponsorId: string, sponsorCode: string) {
    const clean = (sponsorCode || "").trim().toUpperCase();
    if (!clean) throw new BadRequestException("Enter a sponsor code");
    const t = await this.prisma.sponsorTournament.findUnique({ where: { sponsorCode: clean } });
    if (!t || t.visibility !== "PRIVATE") throw new NotFoundException("No tournament matches that sponsor code");
    if (t.sponsorId && t.sponsorId !== sponsorId) throw new ConflictException("That tournament is already claimed by another sponsor");
    const updated = await this.prisma.sponsorTournament.update({
      where: { id: t.id },
      data: { sponsorId },
      include: PROMO_INCLUDE,
    });
    return this.serialize(updated, { codes: true });
  }

  // ---- User: view / join ----------------------------------------------------------------------
  /** Detail for one tournament. Both PUBLIC and PRIVATE tournaments are viewable (private ones are
   * listed on the Tournaments page too); the referral code is only required to JOIN, not to view. */
  async getForUser(id: string, _code: string | undefined, userId: string | undefined) {
    const t = await this.prisma.sponsorTournament.findUnique({
      where: { id },
      include: PROMO_INCLUDE,
    });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");
    const entry = userId ? await this.prisma.promoEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId } } }) : null;
    const myVote = userId ? await this.prisma.tournamentTimeVote.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId } } }) : null;
    return {
      ...this.serialize(t, { codes: false }),
      joined: !!entry,
      mySkills: entry?.skills ?? [],
      myTimeVote: myVote?.timeSlot ?? null,
      // The caller's group placement (once groups are assigned), for the "You're in Group N" panel.
      myGroup: userId ? await this.myGroupSummary(id, userId) : null,
      timeVotes: await this.tallyTimeVotes(id, (t.timeOptions as string[]) ?? []),
    };
  }

  // ---- Starting Wheel: roster + SEALED draw ---------------------------------------------------
  /**
   * Data for the kickoff "Grand Starting Wheel". Returns the tournament's entrants plus a draw
   * result that is SEALED — deterministic from the tournament id — so every spectator's wheel lands
   * on the exact same outcome and nobody can claim it was rigged. Large fields (>24) are shown as up
   * to 31 groups → a name-reel of the winning group; small fields are one-slice-per-player.
   */
  async getRoster(id: string) {
    const t = await this.prisma.sponsorTournament.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");

    const entries = await this.prisma.promoEntry.findMany({
      where: { tournamentId: id },
      orderBy: { joinedAt: "asc" },
      select: { userId: true, user: { select: { fullName: true, email: true } } },
    });
    const players = entries.map((e, i) => ({
      id: e.userId,
      name: e.user.fullName?.trim() || e.user.email.split("@")[0] || `Player ${i + 1}`,
    }));

    const total = players.length;
    if (total === 0) {
      return { mode: "simple" as const, total: 0, groupCount: 0, groupSizes: [], groupIndex: 0, reel: [], winnerSlot: 0, winner: null, hash: this.drawHash(id, -1) };
    }

    const winnerIndex = this.fnv1a(id) % total;
    const winner = players[winnerIndex]!;
    const mode: "grand" | "simple" = total > 24 ? "grand" : "simple";

    if (mode === "simple") {
      // One slice per player — the wheel lands directly on the spotlight cow.
      return {
        mode,
        total,
        groupCount: total,
        groupSizes: players.map(() => 1),
        groupIndex: winnerIndex,
        reel: players,
        winnerSlot: winnerIndex,
        winner,
        hash: this.drawHash(id, winnerIndex),
      };
    }

    // Grand mode: round-robin bucketing into 31 groups (mirrors entry-order placement).
    const groupCount = 31;
    const groupSizes = new Array<number>(groupCount).fill(0);
    for (let i = 0; i < total; i++) groupSizes[i % groupCount] = (groupSizes[i % groupCount] ?? 0) + 1;
    const groupIndex = winnerIndex % groupCount;
    const reel = players.filter((_, i) => i % groupCount === groupIndex);
    const winnerSlot = Math.max(0, reel.findIndex((p) => p.id === winner.id));
    return {
      mode,
      total,
      groupCount,
      groupSizes,
      groupIndex,
      reel,
      winnerSlot,
      winner,
      hash: this.drawHash(id, winnerIndex),
    };
  }

  /** FNV-1a hash → an unsigned 32-bit int; the sealed-draw seed. */
  private fnv1a(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  /** A short, human-showable hash of the sealed outcome (shown as the wheel's "fairness seal"). */
  private drawHash(id: string, winnerIndex: number): string {
    return "0x" + this.fnv1a(`${id}:${winnerIndex}`).toString(16).padStart(8, "0");
  }

  private async hasJoined(userId: string, tournamentId: string): Promise<boolean> {
    const e = await this.prisma.promoEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return !!e;
  }

  /** Register a user into a tournament. PRIVATE ones require the joinCode. Entry closes at
   * entryClosesAt (GROUP: 24h before start; REGULAR: at start). Idempotent — re-joining updates the
   * skill loadout. Each new entrant gets the next sequential `seq` (drives group assignment). */
  async joinTournament(userId: string, id: string, opts: { joinCode?: string; skills?: string[] }) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");

    // PRIVATE tournaments need the tournament referral (join) code.
    if (t.visibility === "PRIVATE") {
      const supplied = (opts.joinCode || "").trim().toUpperCase();
      if (supplied !== t.joinCode) throw new ForbiddenException("This tournament needs a valid referral code to join");
    }
    const closeAt = t.entryClosesAt ?? t.startAt;
    if (closeAt && Date.now() >= closeAt.getTime()) {
      throw new BadRequestException("Entry is closed for this tournament");
    }
    if (t.groupsAssignedAt) {
      throw new BadRequestException("Entry is closed — groups have already been drawn");
    }
    // Lock in the chosen skill loadout (0–2). Deduped + capped; can't be changed after joining.
    const skills = Array.from(new Set(opts.skills ?? [])).slice(0, 2);
    const existing = await this.prisma.promoEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId } } });
    if (existing) {
      await this.prisma.promoEntry.update({ where: { id: existing.id }, data: { skills } });
      return { joined: true, seq: existing.seq, skills };
    }
    const seq = (await this.prisma.promoEntry.count({ where: { tournamentId: id } })) + 1;
    await this.prisma.promoEntry.create({ data: { tournamentId: id, userId, seq, skills } });
    return { joined: true, seq, skills };
  }

  // ---- Start-time voting (both tournament types) ----------------------------------------------
  private async tallyTimeVotes(tournamentId: string, options: string[]): Promise<{ slot: string; votes: number }[]> {
    if (!options.length) return [];
    const votes = await this.prisma.tournamentTimeVote.findMany({ where: { tournamentId }, select: { timeSlot: true } });
    const counts = new Map<string, number>();
    for (const o of options) counts.set(o, 0);
    for (const v of votes) if (counts.has(v.timeSlot)) counts.set(v.timeSlot, counts.get(v.timeSlot)! + 1);
    return options.map((slot) => ({ slot, votes: counts.get(slot) ?? 0 }));
  }

  /** A joined player votes for the tournament's GMT start time; the most-voted slot resolves startAt. */
  async voteStartTime(userId: string, id: string, slot: string) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");
    const options = (t.timeOptions as string[]) ?? [];
    if (!options.includes(slot)) throw new BadRequestException("That isn't one of the tournament's time options");
    if (t.startAt && Date.now() >= t.startAt.getTime()) throw new BadRequestException("Voting is closed — the tournament has started");
    if (!(await this.hasJoined(userId, id))) throw new ForbiddenException("Join the tournament to vote on its start time");

    await this.prisma.tournamentTimeVote.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId } },
      create: { tournamentId: id, userId, timeSlot: slot },
      update: { timeSlot: slot },
    });
    const votes = await this.prisma.tournamentTimeVote.findMany({ where: { tournamentId: id }, select: { timeSlot: true } });
    const startAt = this.computeStartAt(t.startDate, options, votes);
    if (startAt) {
      await this.prisma.sponsorTournament.update({
        where: { id },
        data: { startAt, entryClosesAt: this.entryCloseAt(t.type as "REGULAR" | "GROUP", startAt) },
      });
    }
    return { myTimeVote: slot, startAt, timeVotes: await this.tallyTimeVotes(id, options) };
  }

  /** Tournaments the user has joined (for showing a "joined" state in the UI). */
  async myJoined(userId: string) {
    const rows = await this.prisma.promoEntry.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: { tournament: { include: PROMO_INCLUDE } },
    });
    return rows.map((r) => ({ ...this.serialize(r.tournament, { codes: false }), joinedAt: r.joinedAt }));
  }

  // ---- GROUP tournaments: assignment / scheduling / results -----------------------------------
  /** Scheduled start for a given 1-based tournament day: day 1 = startAt, each later day + 24h. */
  private dayScheduledAt(startAt: Date | null, day: number): Date | null {
    if (!startAt) return null;
    return new Date(startAt.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
  }

  /**
   * Automatically draw the groups for a GROUP tournament: entrants ordered by join `seq` are chunked
   * into groups of 31 (the last group may hold fewer). A separate final group is created to collect
   * every group winner — unless there is only ONE stage group, in which case that group IS the final.
   * Idempotent-guarded (refuses if already drawn). Admin runs this after entry closes.
   */
  async assignGroups(id: string) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.type !== "GROUP") throw new BadRequestException("Only GROUP tournaments have groups");
    if (t.groupsAssignedAt) throw new BadRequestException("Groups have already been drawn");
    const durationDays = t.durationDays ?? 1;
    const entries = await this.prisma.promoEntry.findMany({
      where: { tournamentId: id },
      orderBy: { seq: "asc" },
      select: { userId: true },
    });
    if (entries.length < 2) throw new BadRequestException("Need at least 2 entrants to draw groups");
    const stageCount = Math.ceil(entries.length / GROUP_SIZE);
    const singleGroupIsFinal = stageCount === 1;

    await this.prisma.$transaction(async (tx) => {
      for (let g = 0; g < stageCount; g++) {
        const slice = entries.slice(g * GROUP_SIZE, (g + 1) * GROUP_SIZE);
        const group = await tx.tournamentGroup.create({
          data: {
            tournamentId: id,
            index: g + 1,
            isFinal: singleGroupIsFinal,
            // A single group that IS the final plays on the last (only) day, scheduled immediately.
            day: singleGroupIsFinal ? durationDays : null,
            scheduledAt: singleGroupIsFinal ? this.dayScheduledAt(t.startAt, durationDays) : null,
          },
        });
        await tx.groupMember.createMany({
          data: slice.map((e, i) => ({ groupId: group.id, userId: e.userId, seat: i + 1 })),
        });
      }
      if (!singleGroupIsFinal) {
        // The final group is fixed to the last day; the group winners get seats as they qualify.
        await tx.tournamentGroup.create({
          data: {
            tournamentId: id,
            index: stageCount + 1,
            isFinal: true,
            day: durationDays,
            scheduledAt: this.dayScheduledAt(t.startAt, durationDays),
          },
        });
      }
      await tx.sponsorTournament.update({ where: { id }, data: { groupsAssignedAt: new Date() } });
    });
    return this.getGroups(id);
  }

  /**
   * Manual per-day scheduling: the admin assigns each STAGE group a day in 1..durationDays-1. The
   * final group is fixed to the last day. Sets each group's scheduledAt from the tournament's start
   * time on that day.
   */
  async scheduleGroups(id: string, schedule: { groupId: string; day: number }[]) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.type !== "GROUP") throw new BadRequestException("Only GROUP tournaments have groups");
    if (!t.groupsAssignedAt) throw new BadRequestException("Draw the groups before scheduling them");
    const durationDays = t.durationDays ?? 1;
    const groups = await this.prisma.tournamentGroup.findMany({ where: { tournamentId: id } });
    const stageGroups = groups.filter((g) => !g.isFinal);
    const finalGroup = groups.find((g) => g.isFinal);
    if (stageGroups.length && durationDays < 2) {
      throw new BadRequestException("A group tournament with a separate final needs at least 2 days");
    }
    const maxStageDay = stageGroups.length ? durationDays - 1 : durationDays;
    const map = new Map(schedule.map((s) => [s.groupId, s.day]));
    for (const g of stageGroups) {
      const day = map.get(g.id);
      if (!day) throw new BadRequestException(`Group ${g.index} has not been assigned a day`);
      if (day < 1 || day > maxStageDay) throw new BadRequestException(`Group ${g.index}'s day must be between 1 and ${maxStageDay}`);
    }
    await this.prisma.$transaction(async (tx) => {
      for (const g of stageGroups) {
        const day = map.get(g.id)!;
        await tx.tournamentGroup.update({ where: { id: g.id }, data: { day, scheduledAt: this.dayScheduledAt(t.startAt, day) } });
      }
      if (finalGroup && (finalGroup.day !== durationDays || !finalGroup.scheduledAt)) {
        await tx.tournamentGroup.update({
          where: { id: finalGroup.id },
          data: { day: durationDays, scheduledAt: this.dayScheduledAt(t.startAt, durationDays) },
        });
      }
    });
    return this.getGroups(id);
  }

  /** Full group listing for a tournament (admin view): each group with its members + schedule. */
  async getGroups(id: string) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Tournament not found");
    const groups = await this.prisma.tournamentGroup.findMany({
      where: { tournamentId: id },
      orderBy: [{ isFinal: "asc" }, { index: "asc" }],
      include: { members: { orderBy: { seat: "asc" } } },
    });
    const userIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.userId)))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } })
      : [];
    const nameFor = new Map(users.map((u) => [u.id, u.fullName?.trim() || u.email.split("@")[0] || "Player"]));
    return {
      tournamentId: id,
      type: t.type,
      durationDays: t.durationDays,
      entryClosesAt: t.entryClosesAt,
      groupsAssignedAt: t.groupsAssignedAt,
      groupSize: GROUP_SIZE,
      groups: groups.map((g) => ({
        id: g.id,
        index: g.index,
        isFinal: g.isFinal,
        day: g.day,
        scheduledAt: g.scheduledAt,
        status: g.status,
        winnerUserId: g.winnerUserId,
        winnerName: g.winnerName,
        members: g.members.map((m) => ({
          userId: m.userId,
          name: nameFor.get(m.userId) ?? "Player",
          seat: m.seat,
          result: m.result,
        })),
      })),
    };
  }

  /** The caller's own group placement(s) — their stage group and, if they advanced, the final. */
  private async myGroupSummary(id: string, userId: string) {
    const mems = await this.prisma.groupMember.findMany({
      where: { userId, group: { tournamentId: id } },
      include: { group: true },
    });
    if (!mems.length) return null;
    const toSummary = (m: (typeof mems)[number]) => ({
      groupId: m.group.id,
      index: m.group.index,
      isFinal: m.group.isFinal,
      day: m.group.day,
      scheduledAt: m.group.scheduledAt,
      status: m.group.status,
      result: m.result,
    });
    const stage = mems.find((m) => !m.group.isFinal);
    const final = mems.find((m) => m.group.isFinal);
    return { stage: stage ? toSummary(stage) : null, final: final ? toSummary(final) : null };
  }

  /** Load a group's roster to seed the live game room (called by the socket gateway). */
  async getGroupForRoom(tournamentId: string, groupId: string) {
    const group = await this.prisma.tournamentGroup.findFirst({ where: { id: groupId, tournamentId } });
    if (!group) return null;
    const members = await this.prisma.groupMember.findMany({ where: { groupId }, orderBy: { seat: "asc" } });
    const userIds = members.map((m) => m.userId);
    const [entries, users] = await Promise.all([
      this.prisma.promoEntry.findMany({ where: { tournamentId, userId: { in: userIds } }, select: { userId: true, skills: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true, cosmeticsJson: true } }),
    ]);
    const skillsFor = new Map(entries.map((e) => [e.userId, e.skills]));
    const userFor = new Map(users.map((u) => [u.id, u]));
    return {
      group: { id: group.id, isFinal: group.isFinal, status: group.status, scheduledAt: group.scheduledAt },
      players: members.map((m) => {
        const u = userFor.get(m.userId);
        return {
          userId: m.userId,
          name: u?.fullName?.trim() || u?.email.split("@")[0] || "Player",
          skills: skillsFor.get(m.userId) ?? [],
          cosmetics: (u?.cosmeticsJson ?? {}) as Record<string, unknown>,
        };
      }),
    };
  }

  /**
   * Record a finished group's winner (called once by the gateway when a group room ends). Marks the
   * winner ADVANCED and everyone else ELIMINATED, and either seats the winner into the final group
   * or — if this WAS the final — records the tournament champion. Idempotent (skips a DONE group).
   */
  async recordGroupResult(groupId: string, winnerUserId: string, winnerName: string) {
    const group = await this.prisma.tournamentGroup.findUnique({ where: { id: groupId } });
    if (!group || group.status === "DONE") return;
    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentGroup.update({
        where: { id: groupId },
        data: { status: "DONE", winnerUserId, winnerName: winnerName.slice(0, 120) },
      });
      await tx.groupMember.updateMany({ where: { groupId, userId: winnerUserId }, data: { result: "ADVANCED" } });
      await tx.groupMember.updateMany({ where: { groupId, NOT: { userId: winnerUserId } }, data: { result: "ELIMINATED" } });
      if (group.isFinal) {
        await tx.sponsorTournament.updateMany({
          where: { id: group.tournamentId, completedAt: null },
          data: { completedAt: new Date(), endAt: new Date(), winnerName: winnerName.slice(0, 120) },
        });
      } else {
        const finalGroup = await tx.tournamentGroup.findFirst({ where: { tournamentId: group.tournamentId, isFinal: true } });
        if (finalGroup) {
          const seat = (await tx.groupMember.count({ where: { groupId: finalGroup.id } })) + 1;
          await tx.groupMember.upsert({
            where: { groupId_userId: { groupId: finalGroup.id, userId: winnerUserId } },
            create: { groupId: finalGroup.id, userId: winnerUserId, seat },
            update: {},
          });
        }
      }
    });
  }

  // ---- Serialization --------------------------------------------------------------------------
  private serialize(
    t: SponsorTournament & {
      sponsor?: { id: string; name: string } | null;
      _count?: { entries: number };
      groups?: {
        id: string;
        index: number;
        isFinal: boolean;
        day: number | null;
        scheduledAt: Date | null;
        status: string;
        winnerName: string | null;
        _count?: { members: number };
      }[];
    },
    opts: { codes: boolean },
  ) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      status: t.status,
      type: t.type,
      durationDays: t.durationDays,
      startAt: t.startAt,
      startDate: t.startDate,
      entryClosesAt: t.entryClosesAt,
      groupsAssignedAt: t.groupsAssignedAt,
      timeOptions: (t.timeOptions as string[]) ?? [],
      endAt: t.endAt,
      prizePool: t.prizePool,
      winnerCount: t.winnerCount,
      minPlayers: t.minPlayers,
      maxPlayers: t.maxPlayers,
      seekingSponsor: t.seekingSponsor,
      sponsor: t.sponsor ? { id: t.sponsor.id, name: t.sponsor.name } : null,
      themeId: t.themeId ?? null,
      groups: (t.groups ?? []).map((g) => ({
        id: g.id,
        index: g.index,
        isFinal: g.isFinal,
        day: g.day,
        scheduledAt: g.scheduledAt,
        status: g.status,
        winnerName: g.winnerName,
        memberCount: g._count?.members ?? 0,
      })),
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      entryCount: t._count?.entries ?? 0,
      // Finish/prize lifecycle: a finished tournament is shown with its winner and a
      // "Watch winner" state until the admin marks the prize delivered.
      finished: !!t.completedAt,
      completedAt: t.completedAt,
      winnerName: t.winnerName,
      prizeDelivered: t.prizeDelivered,
      ...(opts.codes ? { sponsorCode: t.sponsorCode, joinCode: t.joinCode } : {}),
    };
  }

  // ---- Sponsorship opportunities (public page) ------------------------------------------------
  /** Private tournaments an admin has opened for sponsorship and not yet assigned to a sponsor.
   * Shown publicly with participation details + prize (if set) — no codes. */
  async listSponsorshipOpportunities() {
    const rows = await this.prisma.sponsorTournament.findMany({
      // Any tournament (PUBLIC or PRIVATE) in "Find Sponsor" mode with no sponsor assigned yet.
      where: { seekingSponsor: true, sponsorId: null, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { entries: true } } },
    });
    return rows.map((t) => this.serialize(t, { codes: false }));
  }

  // ---- Inquiries (contact requests) -----------------------------------------------------------
  /** Public contact request. SPONSORSHIP → admin only. ENTRY → admin, and also the assigned
   * sponsor (if the tournament already has one) so it shows in their dashboard. */
  async createInquiry(input: InquiryInput) {
    const type = input.type === "ENTRY" ? "ENTRY" : input.type === "SPONSORSHIP" ? "SPONSORSHIP" : null;
    if (!type) throw new BadRequestException("Invalid inquiry type");
    const email = (input.email || "").trim();
    if (!/.+@.+\..+/.test(email)) throw new BadRequestException("A valid email is required");

    let sponsorId: string | null = null;
    let tournamentId: string | null = null;
    if (input.tournamentId) {
      const t = await this.prisma.sponsorTournament.findUnique({ where: { id: input.tournamentId } });
      if (!t) throw new NotFoundException("Tournament not found");
      tournamentId = t.id;
      // Entry requests for a sponsor-run tournament also reach that sponsor.
      if (type === "ENTRY") sponsorId = t.sponsorId;
    }
    await this.prisma.inquiry.create({
      data: {
        type,
        email,
        name: (input.name || "").trim().slice(0, 120) || null,
        message: (input.message || "").trim().slice(0, 2000),
        tournamentRef: (input.tournamentRef || "").trim().slice(0, 120) || null,
        tournamentId,
        sponsorId,
        userId: input.userId || null,
      },
    });
    return { ok: true };
  }

  /**
   * Admin resolves a specific-tournament sponsorship request: create (or reuse) a sponsor account,
   * attach the request's tournament to it (so it appears in that sponsor's dashboard), and mark the
   * request handled. Returns the sponsor's login so the admin can hand it over.
   */
  async assignSponsorToInquiry(
    inquiryId: string,
    body: { name?: string; username?: string; password?: string; sponsorId?: string },
  ) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException("Request not found");
    if (!inquiry.tournamentId) throw new BadRequestException("This request isn't tied to a specific tournament");

    let sponsorId = body.sponsorId;
    let credentials: { username: string; password: string } | null = null;
    if (!sponsorId) {
      const created = await this.createSponsor(body.name || inquiry.name || "Sponsor", body.username, body.password);
      sponsorId = created.id;
      credentials = { username: created.username, password: created.password };
    }

    await this.prisma.sponsorTournament.update({
      where: { id: inquiry.tournamentId },
      data: { sponsorId, seekingSponsor: false },
    });
    await this.prisma.inquiry.update({ where: { id: inquiryId }, data: { status: "CONTACTED", sponsorId } });

    const sponsor = await this.prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { id: true, name: true, username: true } });
    return { sponsor, credentials };
  }

  async listInquiries() {
    const rows = await this.prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: { tournament: { select: { id: true, title: true } }, sponsor: { select: { id: true, name: true } } },
    });
    return rows.map((i) => this.serializeInquiry(i));
  }

  async listInquiriesForSponsor(sponsorId: string) {
    const rows = await this.prisma.inquiry.findMany({
      where: { sponsorId },
      orderBy: { createdAt: "desc" },
      include: { tournament: { select: { id: true, title: true } }, sponsor: { select: { id: true, name: true } } },
    });
    return rows.map((i) => this.serializeInquiry(i));
  }

  async setInquiryStatus(id: string, status: string) {
    if (!["NEW", "CONTACTED", "CLOSED"].includes(status)) throw new BadRequestException("Invalid status");
    return this.prisma.inquiry
      .update({ where: { id }, data: { status: status as "NEW" | "CONTACTED" | "CLOSED" } })
      .catch(() => {
        throw new NotFoundException("Inquiry not found");
      });
  }

  private serializeInquiry(i: {
    id: string;
    type: string;
    status: string;
    name: string | null;
    email: string;
    message: string;
    tournamentRef: string | null;
    createdAt: Date;
    tournament?: { id: string; title: string } | null;
    sponsor?: { id: string; name: string } | null;
  }) {
    return {
      id: i.id,
      type: i.type,
      status: i.status,
      name: i.name,
      email: i.email,
      message: i.message,
      tournamentRef: i.tournamentRef,
      createdAt: i.createdAt,
      tournament: i.tournament ? { id: i.tournament.id, title: i.tournament.title } : null,
      sponsor: i.sponsor ? { id: i.sponsor.id, name: i.sponsor.name } : null,
    };
  }

  // ---- User cosmetics (shop) ------------------------------------------------------------------
  async getCosmetics(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { cosmeticsJson: true, cosmeticsOwned: true } });
    if (!u) throw new NotFoundException();
    const cosmetics = (u.cosmeticsJson ?? {}) as Record<string, unknown>;
    const owned = Array.isArray(u.cosmeticsOwned) ? (u.cosmeticsOwned as unknown[]).filter((x): x is string => typeof x === "string") : [];
    // `owned` lets the shop gate premium items; the equipped look itself lives under the other keys.
    return { ...cosmetics, owned };
  }

  /** Save the equipped look. Every item in the look must be either basic/free or one the player has
   * purchased — so a premium item can never be equipped without paying for it. */
  async updateCosmetics(userId: string, patch: Record<string, unknown>) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { cosmeticsJson: true, cosmeticsOwned: true } });
    if (!u) throw new NotFoundException();
    const current = (u.cosmeticsJson ?? {}) as Record<string, unknown>;
    // Never persist the transient `owned` field into the equipped-look blob.
    const { owned: _ignore, ...cleanPatch } = (patch ?? {}) as Record<string, unknown>;
    const next = { ...current, ...cleanPatch };

    const owned = new Set(Array.isArray(u.cosmeticsOwned) ? (u.cosmeticsOwned as unknown[]).filter((x): x is string => typeof x === "string") : []);
    const required = itemKeysForLook(next as { card?: Record<string, unknown>; avatar?: Record<string, unknown>; board?: { skin?: unknown } });
    const missing = required.filter((k) => !isBasicItem(k) && !owned.has(k));
    if (missing.length) {
      throw new BadRequestException("Your look includes items you haven't purchased yet");
    }

    await this.prisma.user.update({ where: { id: userId }, data: { cosmeticsJson: next as Prisma.InputJsonValue } });
    return { ...next, owned: [...owned] };
  }

  // ---- Admin overview (counts + sponsors + pending) -------------------------------------------
  async overview() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, recentEntries, sponsorCount, pending, totalTournaments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      // "Active" = users who joined a tournament in the last 7 days.
      this.prisma.promoEntry.findMany({ where: { joinedAt: { gte: since } }, select: { userId: true } }),
      this.prisma.sponsor.count(),
      this.prisma.sponsorTournament.count({ where: { status: "PENDING" } }),
      this.prisma.sponsorTournament.count(),
    ]);
    return {
      totalUsers,
      newUsersToday: newToday,
      activeUsers7d: new Set(recentEntries.map((r) => r.userId)).size,
      sponsorCount,
      pendingTournaments: pending,
      totalTournaments,
    };
  }
}
