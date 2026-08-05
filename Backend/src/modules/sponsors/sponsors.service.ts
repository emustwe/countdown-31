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
  startAt?: string | null;
  endAt?: string | null;
  prizePool?: string;
  winnerCount?: number | string;
  minPlayers?: number | string | null;
  maxPlayers?: number | string | null;
  seekingSponsor?: boolean;
  sponsorId?: string | null;
}
export interface SponsorCreatePromoInput {
  title?: string;
  description?: string;
  startAt?: string | null;
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

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---- Admin: sponsor accounts ----------------------------------------------------------------
  /**
   * Create a sponsor account. Username and password are optional — if omitted they are generated.
   * Returns the username + PLAINTEXT password so the admin can hand them over (the password is
   * stored only as an argon2 hash).
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
      data: { name: clean, username: uname, passwordHash: await argon2.hash(pass) },
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
      status: s.status,
      tournamentCount: s._count.tournaments,
      createdAt: s.createdAt,
    }));
  }

  /** Set a new password for a sponsor; returns the new PLAINTEXT password (shown once). */
  async regeneratePassword(id: string): Promise<{ password: string }> {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException("Sponsor not found");
    const password = genPassword();
    await this.prisma.sponsor.update({ where: { id }, data: { passwordHash: await argon2.hash(password) } });
    return { password };
  }

  async deleteSponsor(id: string): Promise<void> {
    await this.prisma.sponsor.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("Sponsor not found");
    });
  }

  // ---- Sponsor auth ---------------------------------------------------------------------------
  async login(
    username: string,
    password: string,
  ): Promise<{ token: string; sponsor: { id: string; name: string; username: string } }> {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { username: (username || "").trim().toLowerCase() } });
    // Constant-ish work whether or not the sponsor exists (avoid user enumeration).
    const ok = sponsor ? await argon2.verify(sponsor.passwordHash, password || "") : false;
    if (!sponsor || !ok || sponsor.status !== "ACTIVE") throw new UnauthorizedException("Invalid credentials");
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
    const data: Prisma.SponsorTournamentCreateInput = {
      title: this.reqTitle(input.title),
      description: (input.description ?? "").slice(0, 500),
      visibility,
      status: "APPROVED",
      startAt: this.parseDate(input.startAt),
      endAt: this.parseDate(input.endAt),
      prizePool: this.parsePrize(input.prizePool),
      winnerCount: this.parseWinnerCount(input.winnerCount),
      minPlayers: min,
      maxPlayers: max,
      seekingSponsor: visibility === "PRIVATE" ? !!input.seekingSponsor : false,
      createdBy: "admin",
    };
    if (visibility === "PRIVATE") {
      data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
      data.joinCode = await this.uniqueCode("JOIN", "joinCode");
    } else if (input.sponsorId) {
      data.sponsor = { connect: { id: input.sponsorId } };
    }
    const created = await this.prisma.sponsorTournament.create({
      data,
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    return this.serialize(created, { codes: true });
  }

  /** A sponsor creates a PUBLIC tournament; it starts PENDING until an admin approves it. */
  async createBySponsor(sponsorId: string, input: SponsorCreatePromoInput) {
    const created = await this.prisma.sponsorTournament.create({
      data: {
        title: this.reqTitle(input.title),
        description: (input.description ?? "").slice(0, 500),
        visibility: "PUBLIC",
        status: "PENDING",
        startAt: this.parseDate(input.startAt),
        endAt: this.parseDate(input.endAt),
        prizePool: this.parsePrize(input.prizePool),
        winnerCount: this.parseWinnerCount(input.winnerCount),
        minPlayers: this.parseCount(input.minPlayers),
        maxPlayers: this.parseCount(input.maxPlayers),
        createdBy: sponsorId,
        sponsor: { connect: { id: sponsorId } },
      },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
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
    if (patch.seekingSponsor !== undefined) data.seekingSponsor = !!patch.seekingSponsor;
    if (patch.startAt !== undefined) data.startAt = this.parseDate(patch.startAt);
    if (patch.endAt !== undefined) data.endAt = this.parseDate(patch.endAt);
    if (patch.status !== undefined) {
      if (!["PENDING", "APPROVED", "REJECTED"].includes(patch.status)) throw new BadRequestException("Invalid status");
      data.status = patch.status as "PENDING" | "APPROVED" | "REJECTED";
    }
    if (patch.sponsorId !== undefined) {
      data.sponsor = patch.sponsorId ? { connect: { id: patch.sponsorId } } : { disconnect: true };
    }
    if (patch.visibility !== undefined) {
      const vis = this.parseVisibility(patch.visibility);
      data.visibility = vis;
      // Becoming private without codes yet → generate them.
      if (vis === "PRIVATE" && !existing.sponsorCode) data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
      if (vis === "PRIVATE" && !existing.joinCode) data.joinCode = await this.uniqueCode("JOIN", "joinCode");
    }
    const updated = await this.prisma.sponsorTournament.update({
      where: { id },
      data,
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    return this.serialize(updated, { codes: true });
  }

  async deleteTournament(id: string): Promise<void> {
    await this.prisma.sponsorTournament.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
  }

  async setStatus(id: string, status: "APPROVED" | "REJECTED") {
    return this.prisma.sponsorTournament.update({ where: { id }, data: { status } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
  }

  // ---- Promo tournaments: listing -------------------------------------------------------------
  /** Admin — every tournament, with codes + entry counts. */
  async listAll() {
    const rows = await this.prisma.sponsorTournament.findMany({
      orderBy: { createdAt: "desc" },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    return rows.map((t) => this.serialize(t, { codes: true }));
  }

  /** Public — approved PUBLIC tournaments for the user Tournaments page (no codes). */
  async listApproved() {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: { status: "APPROVED", visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    return rows.map((t) => this.serialize(t, { codes: false }));
  }

  /** A sponsor's own tournaments: ones they created (public) + private ones they've claimed. */
  async listForSponsor(sponsorId: string) {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: { sponsorId },
      orderBy: { createdAt: "desc" },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
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
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    return this.serialize(updated, { codes: true });
  }

  // ---- User: redeem / view / join -------------------------------------------------------------
  /** A user redeems a private joinCode to reveal the tournament (guests allowed to preview). */
  async redeemJoinCode(joinCode: string) {
    const clean = (joinCode || "").trim().toUpperCase();
    if (!clean) throw new BadRequestException("Enter a code");
    const t = await this.prisma.sponsorTournament.findUnique({
      where: { joinCode: clean },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    if (!t || t.visibility !== "PRIVATE" || t.status !== "APPROVED") {
      throw new NotFoundException("That code doesn't match an open tournament");
    }
    return this.serialize(t, { codes: false });
  }

  /** Detail for one tournament. Private tournaments require the correct joinCode as `code`. */
  async getForUser(id: string, code: string | undefined, userId: string | undefined) {
    const t = await this.prisma.sponsorTournament.findUnique({
      where: { id },
      include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");
    if (t.visibility === "PRIVATE") {
      const supplied = (code || "").trim().toUpperCase();
      const joined = userId ? await this.hasJoined(userId, id) : false;
      if (!joined && supplied !== t.joinCode) throw new NotFoundException("Tournament not found");
    }
    const joined = userId ? await this.hasJoined(userId, id) : false;
    return { ...this.serialize(t, { codes: false }), joined };
  }

  private async hasJoined(userId: string, tournamentId: string): Promise<boolean> {
    const e = await this.prisma.promoEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return !!e;
  }

  /** Register a user into a tournament. Private tournaments require the joinCode; entry closes at
   * startAt. Idempotent — re-joining just returns joined. */
  async joinTournament(userId: string, id: string, joinCode: string | undefined) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id } });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");
    if (t.visibility === "PRIVATE") {
      const supplied = (joinCode || "").trim().toUpperCase();
      if (supplied !== t.joinCode) throw new ForbiddenException("This tournament needs a valid referral code to join");
    }
    if (t.startAt && Date.now() >= t.startAt.getTime()) {
      throw new BadRequestException("Entry is closed — this tournament has already started");
    }
    try {
      await this.prisma.promoEntry.create({ data: { tournamentId: id, userId } });
    } catch {
      // Unique violation → already joined; treat as success (idempotent).
    }
    return { joined: true };
  }

  /** Tournaments the user has joined (for showing a "joined" state in the UI). */
  async myJoined(userId: string) {
    const rows = await this.prisma.promoEntry.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: { tournament: { include: { sponsor: { select: { id: true, name: true } }, _count: { select: { entries: true } } } } },
    });
    return rows.map((r) => ({ ...this.serialize(r.tournament, { codes: false }), joinedAt: r.joinedAt }));
  }

  // ---- Serialization --------------------------------------------------------------------------
  private serialize(
    t: SponsorTournament & { sponsor?: { id: string; name: string } | null; _count?: { entries: number } },
    opts: { codes: boolean },
  ) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      status: t.status,
      startAt: t.startAt,
      endAt: t.endAt,
      prizePool: t.prizePool,
      winnerCount: t.winnerCount,
      minPlayers: t.minPlayers,
      maxPlayers: t.maxPlayers,
      seekingSponsor: t.seekingSponsor,
      sponsor: t.sponsor ? { id: t.sponsor.id, name: t.sponsor.name } : null,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      entryCount: t._count?.entries ?? 0,
      ...(opts.codes ? { sponsorCode: t.sponsorCode, joinCode: t.joinCode } : {}),
    };
  }

  // ---- Sponsorship opportunities (public page) ------------------------------------------------
  /** Private tournaments an admin has opened for sponsorship and not yet assigned to a sponsor.
   * Shown publicly with participation details + prize (if set) — no codes. */
  async listSponsorshipOpportunities() {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: { visibility: "PRIVATE", seekingSponsor: true, sponsorId: null, status: "APPROVED" },
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
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { cosmeticsJson: true } });
    if (!u) throw new NotFoundException();
    return (u.cosmeticsJson ?? {}) as Record<string, unknown>;
  }

  /** Merge a partial cosmetics patch into the user's saved cosmetics. */
  async updateCosmetics(userId: string, patch: Record<string, unknown>) {
    const current = await this.getCosmetics(userId);
    const next = { ...current, ...(patch ?? {}) };
    await this.prisma.user.update({ where: { id: userId }, data: { cosmeticsJson: next as Prisma.InputJsonValue } });
    return next;
  }

  // ---- Admin overview (counts + sponsors + pending) -------------------------------------------
  async overview() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, activeRounds, sponsorCount, pending, totalTournaments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.gameRound.findMany({ where: { createdAt: { gte: since } }, select: { userId: true } }),
      this.prisma.sponsor.count(),
      this.prisma.sponsorTournament.count({ where: { status: "PENDING" } }),
      this.prisma.sponsorTournament.count(),
    ]);
    return {
      totalUsers,
      newUsersToday: newToday,
      activeUsers7d: new Set(activeRounds.map((r) => r.userId)).size,
      sponsorCount,
      pendingTournaments: pending,
      totalTournaments,
    };
  }
}
