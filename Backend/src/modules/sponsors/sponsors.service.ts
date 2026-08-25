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
import type { TournamentCampaignManifestInput, CampaignPublishInput, CampaignReviewInput, CampaignEventBatchInput } from "./dto/write.dto";
import type { CampaignAssetKind } from "./campaign-assets";

export interface SponsorTokenPayload {
  sub: string; // sponsor id
  typ: "sponsor";
  name: string;
}

type Visibility = "PUBLIC" | "PRIVATE";

export interface TeamInput {
  name?: string;
  captainName?: string;
}
export interface AdminCreatePromoInput {
  title?: string;
  description?: string;
  visibility?: string;
  type?: string; // REGULAR | INFLUENCER
  startAt?: string | null;
  startDate?: string | null; // GMT date; time comes from user votes
  timeOptions?: string[]; // ["14:00","18:00"] GMT slots
  teams?: TeamInput[]; // teams/captains (name + captain/influencer) when the tournament has influencers
  hasInfluencers?: boolean; // whether named influencer-captains are featured (see schema note)
  groupCount?: number | string; // GROUP: number of teams; REGULAR+influencers: number of influencers
  minGroupPlayers?: number | string | null; // GROUP: players per group
  maxGroupPlayers?: number | string | null;
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
  type?: string;
  startAt?: string | null;
  startDate?: string | null;
  timeOptions?: string[];
  teams?: TeamInput[];
  hasInfluencers?: boolean;
  groupCount?: number | string;
  minGroupPlayers?: number | string | null;
  maxGroupPlayers?: number | string | null;
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
// Distinct team colours (up to 6 groups): blue, red, green, gold, purple, teal.
const TEAM_COLORS = ["#5aa8ff", "#ff6b7f", "#5be348", "#f4b942", "#b48cff", "#38e0d0"];
const MAX_GROUPS = TEAM_COLORS.length;
export const SPONSOR_DEMO_TOURNAMENT_ID = "demo-moomorrow-cup";
const SPONSOR_DEMO_USERNAME = "moomorrow-demo";
const SPONSOR_DEMO_PASSWORD = "DemoSponsor123!";

const SPONSOR_DEMO_MANIFEST: TournamentCampaignManifestInput = {
  identity: {
    campaignTitle: "Play It Forward Cup",
    sponsorName: "MooMorrow Farms",
    disclosureLabel: "Presented by",
    demoDisclaimer: "Fictional sponsor and campaign created only for Countdown 31 product testing.",
  },
  theme: {
    primaryColor: "#fff4cf",
    secondaryColor: "#8cff65",
    backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
    mobileBackgroundImage: "/assets/barnaby/barnaby-field.jpg",
    overlayOpacity: 0.62,
  },
  logoTile: {
    enabled: true,
    logoText: "MOO MORROW",
    animationPreset: "float",
    desktopEnabled: true,
    mobileEnabled: true,
  },
  featurePanel: {
    enabled: true,
    headline: "PLAY TODAY. GROW TOMORROW.",
    body: "Every round helps open more community play spaces for young people.",
  },
  cause: {
    enabled: true,
    label: "Playing for good",
    title: "100 new places to play",
    message: "This fictional campaign demonstrates sponsor-supported community sports funding.",
    beneficiaryName: "MooMorrow Community Play Fund",
    targetAmount: 50000,
    raisedAmount: 32750,
    currency: "USD",
    showProgress: true,
    ctaLabel: "See the demo cause",
    ctaUrl: "https://example.org/moomorrow-play-it-forward",
  },
};

// Standard include for reading a promo tournament with its sponsor, entry count, and teams.
const PROMO_INCLUDE = {
  sponsor: { select: { id: true, name: true } },
  _count: { select: { entries: true } },
  teams: { include: { _count: { select: { entries: true } } } },
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
  private parseType(v: string | undefined): "REGULAR" | "INFLUENCER" {
    return v === "INFLUENCER" ? "INFLUENCER" : "REGULAR";
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
  /** Clamp the requested number of groups/influencers to [min..MAX_GROUPS]. Falls back to the number
   * of team entries provided, else `min`. A GROUP tournament needs ≥2 groups; a REGULAR tournament
   * that merely features influencers can have as few as 1. */
  private parseGroupCount(count: number | string | undefined, teams: TeamInput[] | undefined, min = 2): number {
    const n = Number(count);
    const fromCount = Number.isFinite(n) && n > 0 ? Math.round(n) : Array.isArray(teams) ? teams.length : min;
    return Math.max(min, Math.min(MAX_GROUPS, fromCount || min));
  }
  /** `count` teams (names + captain/influencer names) for an INFLUENCER tournament. */
  private parseTeams(v: TeamInput[] | undefined, count: number): { name: string; captainName: string }[] {
    const arr = Array.isArray(v) ? v : [];
    const teams = arr.slice(0, count).map((t, i) => ({
      name: (t?.name || "").trim().slice(0, 40) || `Team ${i + 1}`,
      captainName: (t?.captainName || "").trim().slice(0, 60) || `Captain ${i + 1}`,
    }));
    while (teams.length < count) teams.push({ name: `Team ${teams.length + 1}`, captainName: `Captain ${teams.length + 1}` });
    return teams;
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
  private async uniqueTeamCode(field: "captainCode" | "memberCode", prefix: string): Promise<string> {
    let code = genCode(prefix);
    for (let i = 0; i < 6 && (await this.prisma.tournamentTeam.findUnique({ where: { [field]: code } as never })); i++) {
      code = genCode(prefix);
    }
    return code;
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
    const hasInfluencers = !!input.hasInfluencers;
    // Teams (groups/captains) exist for any GROUP tournament, and for a REGULAR one that features
    // named influencers.
    const wantsTeams = type === "INFLUENCER" || hasInfluencers;
    const startDate = this.parseDate(input.startDate);
    const timeOptions = this.parseTimeOptions(input.timeOptions);
    // GROUP needs ≥2 groups; a REGULAR tournament with influencers can have as few as 1 (plain, no groups).
    const groupCount = wantsTeams ? this.parseGroupCount(input.groupCount, input.teams, type === "INFLUENCER" ? 2 : 1) : 2;
    const data: Prisma.SponsorTournamentCreateInput = {
      title: this.reqTitle(input.title),
      description: (input.description ?? "").slice(0, 500),
      visibility,
      status: "APPROVED",
      type,
      hasInfluencers,
      groupCount,
      minGroupPlayers: type === "INFLUENCER" ? this.parseCount(input.minGroupPlayers) : null,
      maxGroupPlayers: type === "INFLUENCER" ? this.parseCount(input.maxGroupPlayers) : null,
      startDate,
      timeOptions,
      startAt: startDate ? this.computeStartAt(startDate, timeOptions, []) : this.parseDate(input.startAt),
      endAt: this.parseDate(input.endAt),
      prizePool: this.parsePrize(input.prizePool),
      winnerCount: this.parseWinnerCount(input.winnerCount),
      minPlayers: min,
      maxPlayers: max,
      // "With sponsor" but none assigned yet → the tournament is seeking a sponsor (shown on the
      // Tournaments page with a "needs sponsor" indicator). Applies to any visibility now.
      seekingSponsor: !!input.seekingSponsor && !input.sponsorId,
      createdBy: "admin",
    };
    // Private tournaments always get a sponsorCode (for a sponsor to claim later) + a joinCode.
    if (visibility === "PRIVATE") {
      data.sponsorCode = await this.uniqueCode("SPN", "sponsorCode");
      data.joinCode = await this.uniqueCode("JOIN", "joinCode");
    }
    // A sponsor may be attached directly at creation, regardless of visibility.
    if (input.sponsorId) data.sponsor = { connect: { id: input.sponsorId } };
    if (wantsTeams) data.teams = { create: await this.buildTeams(input.teams, groupCount) };
    const created = await this.prisma.sponsorTournament.create({ data, include: PROMO_INCLUDE });
    return this.serialize(created, { codes: true });
  }

  /** Build `count` teams for an influencer tournament. Each team gets a distinct colour and TWO
   * codes: a captainCode (the influencer's special entry code) and a memberCode (shared with the
   * captain's followers to join as players). */
  private async buildTeams(input: TeamInput[] | undefined, count: number) {
    const teams = this.parseTeams(input, count);
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push({
        name: teams[i]!.name,
        captainName: teams[i]!.captainName,
        captainCode: await this.uniqueTeamCode("captainCode", "CAP"),
        memberCode: await this.uniqueTeamCode("memberCode", "TEAM"),
        color: TEAM_COLORS[i % TEAM_COLORS.length]!,
      });
    }
    return out;
  }

  /** A sponsor creates a PUBLIC tournament; it starts PENDING until an admin approves it. */
  async createBySponsor(sponsorId: string, input: SponsorCreatePromoInput) {
    const type = this.parseType(input.type);
    const hasInfluencers = !!input.hasInfluencers;
    const wantsTeams = type === "INFLUENCER" || hasInfluencers;
    const startDate = this.parseDate(input.startDate);
    const timeOptions = this.parseTimeOptions(input.timeOptions);
    // GROUP needs ≥2 groups; a REGULAR tournament with influencers can have as few as 1 (plain, no groups).
    const groupCount = wantsTeams ? this.parseGroupCount(input.groupCount, input.teams, type === "INFLUENCER" ? 2 : 1) : 2;
    const data: Prisma.SponsorTournamentCreateInput = {
      title: this.reqTitle(input.title),
      description: (input.description ?? "").slice(0, 500),
      visibility: "PUBLIC",
      status: "PENDING",
      type,
      hasInfluencers,
      groupCount,
      minGroupPlayers: type === "INFLUENCER" ? this.parseCount(input.minGroupPlayers) : null,
      maxGroupPlayers: type === "INFLUENCER" ? this.parseCount(input.maxGroupPlayers) : null,
      startDate,
      timeOptions,
      startAt: startDate ? this.computeStartAt(startDate, timeOptions, []) : this.parseDate(input.startAt),
      endAt: this.parseDate(input.endAt),
      prizePool: this.parsePrize(input.prizePool),
      winnerCount: this.parseWinnerCount(input.winnerCount),
      minPlayers: this.parseCount(input.minPlayers),
      maxPlayers: this.parseCount(input.maxPlayers),
      createdBy: sponsorId,
      sponsor: { connect: { id: sponsorId } },
    };
    if (wantsTeams) data.teams = { create: await this.buildTeams(input.teams, groupCount) };
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
    if (patch.minGroupPlayers !== undefined) data.minGroupPlayers = this.parseCount(patch.minGroupPlayers);
    if (patch.maxGroupPlayers !== undefined) data.maxGroupPlayers = this.parseCount(patch.maxGroupPlayers);
    if (patch.hasInfluencers !== undefined) data.hasInfluencers = !!patch.hasInfluencers;
    if (patch.seekingSponsor !== undefined) data.seekingSponsor = !!patch.seekingSponsor;
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
    const updated = await this.prisma.sponsorTournament.update({ where: { id }, data, include: PROMO_INCLUDE });
    return this.serialize(updated, { codes: true });
  }

  async deleteTournament(id: string): Promise<void> {
    await this.prisma.sponsorTournament.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
    this.audit.record("TOURNAMENT_DELETE", { detail: { tournamentId: id } });
  }

  async setStatus(id: string, status: "APPROVED" | "REJECTED") {
    this.audit.record("TOURNAMENT_STATUS", { detail: { tournamentId: id, status } });
    return this.prisma.sponsorTournament.update({ where: { id }, data: { status } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
  }

  /** Builds a repeatable fictional sponsor pilot with a published campaign and sample analytics.
   * It is intentionally explicit and admin-only: normal reads never create database records. */
  async setupSponsorDemo(actorId: string) {
    const passwordHash = await argon2.hash(SPONSOR_DEMO_PASSWORD);
    const now = new Date();
    const dateBucket = now.toISOString().slice(0, 10);
    const result = await this.prisma.$transaction(async (tx) => {
      const sponsor = await tx.sponsor.upsert({
        where: { username: SPONSOR_DEMO_USERNAME },
        update: {
          name: "MooMorrow Farms",
          status: "ACTIVE",
          passwordHash,
          passwordEnc: encryptSecret(SPONSOR_DEMO_PASSWORD),
        },
        create: {
          name: "MooMorrow Farms",
          username: SPONSOR_DEMO_USERNAME,
          passwordHash,
          passwordEnc: encryptSecret(SPONSOR_DEMO_PASSWORD),
        },
      });
      const tournament = await tx.sponsorTournament.upsert({
        where: { id: SPONSOR_DEMO_TOURNAMENT_ID },
        update: {
          title: "MooMorrow Play It Forward Cup",
          description: "A complete fictional sponsor pilot: branded lobby, live arena placements, cause message, approvals, and proof-of-performance.",
          visibility: "PUBLIC",
          status: "APPROVED",
          type: "REGULAR",
          hasInfluencers: false,
          prizePool: "5,000 USDT",
          winnerCount: 3,
          minPlayers: 2,
          maxPlayers: 100,
          sponsorId: sponsor.id,
          seekingSponsor: false,
          startAt: null,
          endAt: null,
        },
        create: {
          id: SPONSOR_DEMO_TOURNAMENT_ID,
          title: "MooMorrow Play It Forward Cup",
          description: "A complete fictional sponsor pilot: branded lobby, live arena placements, cause message, approvals, and proof-of-performance.",
          visibility: "PUBLIC",
          status: "APPROVED",
          type: "REGULAR",
          hasInfluencers: false,
          prizePool: "5,000 USDT",
          winnerCount: 3,
          minPlayers: 2,
          maxPlayers: 100,
          sponsorId: sponsor.id,
          seekingSponsor: false,
          createdBy: actorId,
        },
      });
      const campaign = await tx.tournamentCampaign.upsert({
        where: { tournamentId: tournament.id },
        update: { isPaused: false, isCausePaused: false },
        create: { tournamentId: tournament.id },
        include: { versions: { orderBy: { revision: "desc" }, take: 1 } },
      });
      await tx.tournamentCampaignVersion.updateMany({
        where: { campaignId: campaign.id, status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      const version = await tx.tournamentCampaignVersion.create({
        data: {
          campaignId: campaign.id,
          revision: (campaign.versions[0]?.revision ?? 0) + 1,
          status: "PUBLISHED",
          manifest: SPONSOR_DEMO_MANIFEST as Prisma.InputJsonValue,
          createdBy: actorId,
          approvedBy: actorId,
          approvedAt: now,
          publishedAt: now,
          activateAt: now,
          reviews: {
            create: [
              { reviewerId: actorId, lane: "BRAND", decision: "APPROVED", comment: "Demo brand presentation approved." },
              { reviewerId: actorId, lane: "SAFETY", decision: "APPROVED", comment: "Demo placement and cause messaging approved." },
            ],
          },
        },
      });
      await tx.tournamentCampaignEventAggregate.deleteMany({ where: { campaignId: campaign.id } });
      await tx.tournamentCampaignEventAggregate.createMany({
        data: [
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "arenaBackground", deviceClass: "desktop", eventType: "eligible_load", count: 184, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "arenaBackground", deviceClass: "desktop", eventType: "rendered_impression", count: 181, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "arenaBackground", deviceClass: "mobile", eventType: "rendered_impression", count: 126, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "logoTile", deviceClass: "desktop", eventType: "rendered_impression", count: 181, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "logoTile", deviceClass: "mobile", eventType: "rendered_impression", count: 126, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "logoTile", deviceClass: "desktop", eventType: "viewable_seconds", count: 181, totalSeconds: 4525, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "causeCard", deviceClass: "desktop", eventType: "rendered_impression", count: 181, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "causeCard", deviceClass: "mobile", eventType: "rendered_impression", count: 126, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "causeCard", deviceClass: "mobile", eventType: "cause_expand", count: 38, dateBucket },
          { campaignId: campaign.id, tournamentId: tournament.id, revision: version.revision, placement: "causeCard", deviceClass: "mobile", eventType: "cta_click", count: 17, dateBucket },
        ],
      });
      return { sponsor, tournament, version };
    });
    this.audit.record("TOURNAMENT_SPONSOR_DEMO_SETUP", { actor: actorId, detail: { tournamentId: result.tournament.id, sponsorId: result.sponsor.id, revision: result.version.revision } });
    return {
      sponsor: { id: result.sponsor.id, name: result.sponsor.name, username: SPONSOR_DEMO_USERNAME, password: SPONSOR_DEMO_PASSWORD },
      tournament: { id: result.tournament.id, title: result.tournament.title },
      revision: result.version.revision,
    };
  }

  // ---- Tournament campaign studio ------------------------------------------------------------
  async getCampaignForAdmin(tournamentId: string) {
    const tournament = await this.prisma.sponsorTournament.findUnique({
      where: { id: tournamentId },
      include: { sponsor: { select: { id: true, name: true } } },
    });
    if (!tournament) throw new NotFoundException("Tournament not found");
    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: { versions: { orderBy: { revision: "desc" }, include: { reviews: { orderBy: { createdAt: "asc" } } } } },
    });
    const draft = campaign?.versions.find((version) => ["DRAFT", "IN_REVIEW", "APPROVED"].includes(version.status)) ?? null;
    const now = new Date();
    const published = campaign?.versions.find((version) => version.status === "PUBLISHED" &&
      (!version.activateAt || version.activateAt <= now) && (!version.expireAt || version.expireAt > now)) ?? null;
    return {
      tournament: { id: tournament.id, title: tournament.title, sponsor: tournament.sponsor },
      campaign: campaign ? {
        id: campaign.id,
        isPaused: campaign.isPaused,
        isCausePaused: campaign.isCausePaused,
        draft: draft ? this.serializeCampaignVersion(draft) : null,
        published: published ? this.serializeCampaignVersion(published) : null,
        versions: campaign.versions.map((version) => this.serializeCampaignVersion(version)),
      } : null,
    };
  }

  async saveCampaignDraft(tournamentId: string, manifest: TournamentCampaignManifestInput, actorId: string) {
    const exists = await this.prisma.sponsorTournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Tournament not found");
    const result = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.tournamentCampaign.upsert({
        where: { tournamentId },
        update: {},
        create: { tournamentId },
        include: { versions: { orderBy: { revision: "desc" }, include: { reviews: true } } },
      });
      const currentDraft = campaign.versions.find((version) => version.status === "DRAFT" && version.reviews.length === 0);
      const version = currentDraft
        ? await tx.tournamentCampaignVersion.update({
            where: { id: currentDraft.id },
            data: { manifest: manifest as Prisma.InputJsonValue, createdBy: actorId },
          })
        : await tx.tournamentCampaignVersion.create({
            data: {
              campaignId: campaign.id,
              revision: (campaign.versions[0]?.revision ?? 0) + 1,
              manifest: manifest as Prisma.InputJsonValue,
              createdBy: actorId,
            },
          });
      return { campaign, version };
    });
    this.audit.record("TOURNAMENT_CAMPAIGN_DRAFT", { actor: actorId, detail: { tournamentId, revision: result.version.revision } });
    return this.getCampaignForAdmin(tournamentId);
  }

  async submitCampaignForReview(tournamentId: string, actorId: string) {
    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: { versions: { orderBy: { revision: "desc" } } },
    });
    if (!campaign) throw new BadRequestException("Save a campaign draft before review");
    const draft = campaign.versions.find((version) => version.status === "DRAFT");
    if (!draft) throw new BadRequestException("There is no draft ready for review");
    const priorDecision = await this.prisma.tournamentCampaignReview.findFirst({ where: { versionId: draft.id } });
    if (priorDecision) throw new BadRequestException("Save the requested changes as a new revision before resubmitting");
    await this.prisma.tournamentCampaignVersion.update({ where: { id: draft.id }, data: { status: "IN_REVIEW" } });
    this.audit.record("TOURNAMENT_CAMPAIGN_SUBMIT_REVIEW", { actor: actorId, detail: { tournamentId, revision: draft.revision } });
    return this.getCampaignForAdmin(tournamentId);
  }

  async reviewCampaignVersion(tournamentId: string, versionId: string, input: CampaignReviewInput, actorId: string) {
    const version = await this.prisma.tournamentCampaignVersion.findFirst({
      where: { id: versionId, campaign: { tournamentId } },
      include: { reviews: { orderBy: { createdAt: "desc" } } },
    });
    if (!version) throw new NotFoundException("Campaign revision not found");
    if (version.status !== "IN_REVIEW") throw new BadRequestException("Only an in-review revision can receive a decision");
    if (input.decision === "CHANGES_REQUESTED" && !input.comment.trim()) throw new BadRequestException("Explain what needs to change");
    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentCampaignReview.create({
        data: { versionId, reviewerId: actorId, lane: input.lane, decision: input.decision, comment: input.comment.trim() },
      });
      if (input.decision === "CHANGES_REQUESTED") {
        await tx.tournamentCampaignVersion.update({ where: { id: versionId }, data: { status: "DRAFT", approvedAt: null, approvedBy: null } });
        return;
      }
      if (input.decision === "APPROVED") {
        const approvals = await tx.tournamentCampaignReview.findMany({
          where: { versionId, decision: "APPROVED" },
          select: { lane: true },
        });
        const lanes = new Set([...approvals.map((review) => review.lane), input.lane]);
        if (lanes.has("BRAND") && lanes.has("SAFETY")) {
          await tx.tournamentCampaignVersion.update({
            where: { id: versionId },
            data: { status: "APPROVED", approvedAt: new Date(), approvedBy: actorId },
          });
        }
      }
    });
    this.audit.record("TOURNAMENT_CAMPAIGN_REVIEW", { actor: actorId, detail: { tournamentId, versionId, lane: input.lane, decision: input.decision } });
    return this.getCampaignForAdmin(tournamentId);
  }

  async publishCampaign(tournamentId: string, actorId: string, input: CampaignPublishInput) {
    const now = new Date();
    const activateAt = input.activateAt ? new Date(input.activateAt) : now;
    const expireAt = input.expireAt ? new Date(input.expireAt) : null;
    if (expireAt && expireAt <= activateAt) throw new BadRequestException("Expiration must be after activation");
    const publishedRevision = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.tournamentCampaign.findUnique({
        where: { tournamentId },
        include: { versions: { orderBy: { revision: "desc" } } },
      });
      if (!campaign) throw new BadRequestException("Save a campaign draft before publishing");
      const approved = campaign.versions.find((version) => version.status === "APPROVED");
      if (!approved) throw new BadRequestException("Brand and safety approval are required before publishing");
      if (activateAt > now) {
        await tx.tournamentCampaignVersion.updateMany({ where: { campaignId: campaign.id, status: "PUBLISHED", activateAt: { gt: now } }, data: { status: "ARCHIVED" } });
        await tx.tournamentCampaignVersion.updateMany({
          where: { campaignId: campaign.id, status: "PUBLISHED", OR: [{ expireAt: null }, { expireAt: { gt: activateAt } }] },
          data: { expireAt: activateAt },
        });
      } else {
        await tx.tournamentCampaignVersion.updateMany({ where: { campaignId: campaign.id, status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      }
      await tx.tournamentCampaignVersion.update({
        where: { id: approved.id },
        data: { status: "PUBLISHED", publishedAt: now, activateAt, expireAt, createdBy: actorId },
      });
      await tx.tournamentCampaign.update({ where: { id: campaign.id }, data: { isPaused: false, isCausePaused: false } });
      return approved.revision;
    });
    this.audit.record("TOURNAMENT_CAMPAIGN_PUBLISH", { actor: actorId, detail: { tournamentId, revision: publishedRevision, activateAt: activateAt.toISOString(), expireAt: expireAt?.toISOString() ?? null } });
    return this.getCampaignForAdmin(tournamentId);
  }

  async rollbackCampaign(tournamentId: string, versionId: string, actorId: string) {
    const rollbackRevision = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.tournamentCampaign.findUnique({
        where: { tournamentId },
        include: { versions: { orderBy: { revision: "desc" } } },
      });
      if (!campaign) throw new NotFoundException("Campaign not found");
      const source = campaign.versions.find((version) => version.id === versionId);
      if (!source || !["PUBLISHED", "ARCHIVED"].includes(source.status) || !source.approvedAt) {
        throw new BadRequestException("Only a previously approved published revision can be restored");
      }
      const now = new Date();
      await tx.tournamentCampaignVersion.updateMany({ where: { campaignId: campaign.id, status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      const restored = await tx.tournamentCampaignVersion.create({
        data: {
          campaignId: campaign.id,
          revision: (campaign.versions[0]?.revision ?? 0) + 1,
          status: "PUBLISHED",
          manifest: source.manifest as Prisma.InputJsonValue,
          createdBy: actorId,
          approvedBy: actorId,
          approvedAt: now,
          publishedAt: now,
          activateAt: now,
        },
      });
      await tx.tournamentCampaign.update({ where: { id: campaign.id }, data: { isPaused: false } });
      return restored.revision;
    });
    this.audit.record("TOURNAMENT_CAMPAIGN_ROLLBACK", { actor: actorId, detail: { tournamentId, sourceVersionId: versionId, revision: rollbackRevision } });
    return this.getCampaignForAdmin(tournamentId);
  }

  async setCampaignPaused(tournamentId: string, isPaused: boolean) {
    const campaign = await this.prisma.tournamentCampaign.findUnique({ where: { tournamentId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    const updated = await this.prisma.tournamentCampaign.update({ where: { id: campaign.id }, data: { isPaused } });
    this.audit.record(isPaused ? "TOURNAMENT_CAMPAIGN_PAUSE" : "TOURNAMENT_CAMPAIGN_RESUME", { detail: { tournamentId } });
    return { tournamentId, isPaused: updated.isPaused };
  }

  async setCampaignCausePaused(tournamentId: string, isCausePaused: boolean) {
    const campaign = await this.prisma.tournamentCampaign.findUnique({ where: { tournamentId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    const updated = await this.prisma.tournamentCampaign.update({ where: { id: campaign.id }, data: { isCausePaused } });
    this.audit.record(isCausePaused ? "TOURNAMENT_CAUSE_PAUSE" : "TOURNAMENT_CAUSE_RESUME", { detail: { tournamentId } });
    return { tournamentId, isCausePaused: updated.isCausePaused };
  }

  async listCampaignAssets(tournamentId: string) {
    const tournament = await this.prisma.sponsorTournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
    if (!tournament) throw new NotFoundException("Tournament not found");
    const campaign = await this.prisma.tournamentCampaign.findUnique({ where: { tournamentId } });
    if (!campaign) return { assets: [] };
    const assets = await this.prisma.tournamentCampaignAsset.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "desc" },
    });
    return { assets: assets.map((asset) => this.serializeCampaignAsset(asset)) };
  }

  async recordCampaignAsset(tournamentId: string, input: {
    kind: CampaignAssetKind;
    url: string;
    storagePath: string;
    originalName: string;
    mimeType: string;
    bytes: number;
    createdBy: string;
    mediaType: "image" | "video";
  }) {
    const exists = await this.prisma.sponsorTournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Tournament not found");
    const asset = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.tournamentCampaign.upsert({
        where: { tournamentId },
        update: {},
        create: { tournamentId },
      });
      const previous = await tx.tournamentCampaignAsset.findFirst({
        where: { campaignId: campaign.id, kind: input.kind, archivedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (previous) {
        await tx.tournamentCampaignAsset.update({ where: { id: previous.id }, data: { archivedAt: new Date() } });
      }
      return tx.tournamentCampaignAsset.create({
        data: {
          campaignId: campaign.id,
          kind: input.kind,
          url: input.url,
          storagePath: input.storagePath,
          originalName: input.originalName,
          mimeType: input.mimeType,
          bytes: input.bytes,
          createdBy: input.createdBy,
          supersedesId: previous?.id,
        },
      });
    });
    this.audit.record("TOURNAMENT_CAMPAIGN_ASSET_UPLOAD", {
      actor: input.createdBy,
      detail: { tournamentId, assetId: asset.id, kind: input.kind, bytes: input.bytes, mediaType: input.mediaType },
    });
    return { asset: this.serializeCampaignAsset(asset), ...(await this.listCampaignAssets(tournamentId)) };
  }

  async getActiveCampaign(tournamentId: string) {
    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: {
        tournament: { select: { id: true, title: true, status: true } },
        versions: { orderBy: { revision: "desc" } },
      },
    });
    const now = new Date();
    const version = campaign?.versions.find((candidate) =>
      candidate.status === "PUBLISHED" && (!candidate.activateAt || candidate.activateAt <= now) && (!candidate.expireAt || candidate.expireAt > now));
    if (!campaign || campaign.isPaused || campaign.tournament.status !== "APPROVED" || !version) {
      return { campaign: null };
    }
    return {
      campaign: {
        tournamentId,
        tournamentTitle: campaign.tournament.title,
        revision: version.revision,
        manifest: version.manifest,
        isCausePaused: campaign.isCausePaused,
        activateAt: version.activateAt,
        expireAt: version.expireAt,
      },
    };
  }

  private serializeCampaignVersion(version: { id: string; revision: number; status: string; manifest: Prisma.JsonValue; createdAt: Date; publishedAt: Date | null; approvedBy: string | null; approvedAt: Date | null; activateAt: Date | null; expireAt: Date | null; reviews?: Array<{ id: string; reviewerId: string; lane: string; decision: string; comment: string; createdAt: Date }> }) {
    return {
      id: version.id,
      revision: version.revision,
      status: version.status,
      manifest: version.manifest,
      createdAt: version.createdAt,
      publishedAt: version.publishedAt,
      approvedBy: version.approvedBy,
      approvedAt: version.approvedAt,
      activateAt: version.activateAt,
      expireAt: version.expireAt,
      reviews: (version.reviews ?? []).map((review) => ({
        id: review.id,
        reviewerId: review.reviewerId,
        lane: review.lane,
        decision: review.decision,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
    };
  }

  private serializeCampaignAsset(asset: { id: string; kind: string; url: string; originalName: string; mimeType: string; bytes: number; supersedesId: string | null; archivedAt: Date | null; createdAt: Date }) {
    return {
      id: asset.id,
      kind: asset.kind,
      url: asset.url,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      mediaType: asset.mimeType.startsWith("video/") ? "video" : "image",
      bytes: asset.bytes,
      supersedesId: asset.supersedesId,
      archivedAt: asset.archivedAt,
      createdAt: asset.createdAt,
    };
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

  // A finished tournament stays on the Tournaments page for one hour after it starts, then drops off.
  private static readonly LISTING_TTL_MS = 60 * 60 * 1000;

  /** Public — approved tournaments (PUBLIC and PRIVATE) for the user Tournaments page (no codes).
   * Private ones are listed so players can find them, but joining still needs the referral code.
   * Tournaments whose start was more than an hour ago are hidden (considered finished). */
  async listApproved() {
    const cutoff = new Date(Date.now() - SponsorsService.LISTING_TTL_MS);
    const rows = await this.prisma.sponsorTournament.findMany({
      where: {
        status: "APPROVED",
        // Private tournaments are code-gated (reached via their referral code), never publicly listed.
        visibility: "PUBLIC",
        // Not yet finished: either no start scheduled, or it started within the last hour.
        OR: [{ startAt: null }, { startAt: { gte: cutoff } }],
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
      myTeamId: entry?.teamId ?? null,
      myIsCaptain: entry?.isCaptain ?? false,
      myTimeVote: myVote?.timeSlot ?? null,
      timeVotes: await this.tallyTimeVotes(id, (t.timeOptions as string[]) ?? []),
    };
  }

  private async hasJoined(userId: string, tournamentId: string): Promise<boolean> {
    const e = await this.prisma.promoEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return !!e;
  }

  /** Register a user into a tournament. INFLUENCER tournaments require a team captain code; PRIVATE
   * ones require the joinCode. Entry closes at startAt. Idempotent — re-joining updates the team. */
  async joinTournament(userId: string, id: string, opts: { joinCode?: string; teamCode?: string }) {
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id }, include: { teams: true } });
    if (!t || t.status !== "APPROVED") throw new NotFoundException("Tournament not found");

    // PRIVATE tournaments need the tournament referral (join) code. INFLUENCER tournaments need a
    // team code (the group key). A PRIVATE INFLUENCER tournament requires BOTH keys.
    if (t.visibility === "PRIVATE") {
      const supplied = (opts.joinCode || "").trim().toUpperCase();
      if (supplied !== t.joinCode) throw new ForbiddenException("This tournament needs a valid referral code to join");
    }
    let teamId: string | null = null;
    let isCaptain = false;
    if (t.type === "INFLUENCER") {
      const supplied = (opts.teamCode || "").trim().toUpperCase();
      // The captain's special code enters them AS the captain; the member code joins as a player.
      const asCaptain = t.teams.find((tm) => tm.captainCode.toUpperCase() === supplied);
      const asMember = t.teams.find((tm) => (tm.memberCode ?? "").toUpperCase() === supplied);
      const team = asCaptain ?? asMember;
      if (!team) throw new ForbiddenException("Enter a valid team code (captain or player code) to join");
      teamId = team.id;
      isCaptain = !!asCaptain;
      if (isCaptain) {
        // Only one captain seat per team.
        const existingCaptain = await this.prisma.promoEntry.findFirst({
          where: { tournamentId: id, teamId: team.id, isCaptain: true, NOT: { userId } },
        });
        if (existingCaptain) throw new ConflictException("This team already has a captain");
      }
    }
    if (t.startAt && Date.now() >= t.startAt.getTime()) {
      throw new BadRequestException("Entry is closed — this tournament has already started");
    }
    await this.prisma.promoEntry.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId } },
      create: { tournamentId: id, userId, teamId, isCaptain },
      update: { teamId, isCaptain },
    });
    return { joined: true, teamId, isCaptain };
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
    if (startAt) await this.prisma.sponsorTournament.update({ where: { id }, data: { startAt } });
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

  // ---- Serialization --------------------------------------------------------------------------
  private serialize(
    t: SponsorTournament & {
      sponsor?: { id: string; name: string } | null;
      _count?: { entries: number };
      teams?: {
        id: string;
        name: string;
        captainName: string;
        captainCode: string;
        memberCode: string | null;
        color: string;
        _count?: { entries: number };
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
      hasInfluencers: t.hasInfluencers,
      groupCount: t.groupCount,
      minGroupPlayers: t.minGroupPlayers,
      maxGroupPlayers: t.maxGroupPlayers,
      startAt: t.startAt,
      startDate: t.startDate,
      timeOptions: (t.timeOptions as string[]) ?? [],
      endAt: t.endAt,
      prizePool: t.prizePool,
      winnerCount: t.winnerCount,
      minPlayers: t.minPlayers,
      maxPlayers: t.maxPlayers,
      seekingSponsor: t.seekingSponsor,
      sponsor: t.sponsor ? { id: t.sponsor.id, name: t.sponsor.name } : null,
      teams: (t.teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
        captainName: team.captainName,
        color: team.color,
        memberCount: team._count?.entries ?? 0,
        ...(opts.codes ? { captainCode: team.captainCode, memberCode: team.memberCode } : {}),
      })),
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
    const cleanPatch = { ...(patch ?? {}) } as Record<string, unknown>;
    delete cleanPatch.owned;
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

  // ---- Tournament Campaign Analytics & Reporting (Chunk 5) ------------------------------------
  async recordCampaignEvents(tournamentId: string, input: CampaignEventBatchInput, isBotOrAdmin = false) {
    if (isBotOrAdmin) {
      return { recorded: 0, ignored: true, reason: "bot_or_admin_session" };
    }

    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { revision: "desc" },
          take: 1,
        },
      },
    });

    if (!campaign || campaign.isPaused || !campaign.versions.length) {
      return { recorded: 0, ignored: true, reason: "campaign_not_live" };
    }

    const liveVersion = campaign.versions[0];
    const targetRevision = input.revision ?? (liveVersion ? liveVersion.revision : 1);
    const dateBucket = new Date().toISOString().slice(0, 10);
    const deviceClass = input.deviceClass || "desktop";

    let recorded = 0;
    for (const event of input.events) {
      const count = Math.max(1, Math.min(500, event.count || 1));
      const seconds = Math.max(0, Math.min(600, event.seconds || 0));

      await this.prisma.tournamentCampaignEventAggregate.upsert({
        where: {
          campaignId_revision_placement_deviceClass_eventType_dateBucket: {
            campaignId: campaign.id,
            revision: targetRevision,
            placement: event.placement,
            deviceClass,
            eventType: event.eventType,
            dateBucket,
          },
        },
        create: {
          campaignId: campaign.id,
          tournamentId,
          revision: targetRevision,
          placement: event.placement,
          deviceClass,
          eventType: event.eventType,
          count,
          totalSeconds: seconds,
          dateBucket,
        },
        update: {
          count: { increment: count },
          totalSeconds: { increment: seconds },
        },
      });
      recorded++;
    }

    return { success: true, recorded };
  }

  async getCampaignReport(tournamentId: string, sponsorId?: string) {
    const tournament = await this.prisma.sponsorTournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, title: true, sponsorId: true, sponsor: { select: { id: true, name: true } } },
    });
    if (!tournament) throw new NotFoundException("Tournament not found");
    if (sponsorId && tournament.sponsorId !== sponsorId) {
      throw new ForbiddenException("Not authorized for this tournament report");
    }

    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { revision: "desc" },
          take: 1,
        },
        events: true,
      },
    });

    const liveVersion = campaign?.versions[0] ?? null;
    const manifest = (liveVersion?.manifest ?? {}) as unknown as TournamentCampaignManifestInput;
    const events = campaign?.events ?? [];

    let eligibleSessions = 0;
    let renderedImpressions = 0;
    let totalViewableSeconds = 0;
    let causeExpansions = 0;
    let ctaClicks = 0;
    let completedLoops = 0;

    const placementMap: Record<string, { impressions: number; seconds: number; interactions: number }> = {
      logoTile: { impressions: 0, seconds: 0, interactions: 0 },
      arenaBackground: { impressions: 0, seconds: 0, interactions: 0 },
      featurePanel: { impressions: 0, seconds: 0, interactions: 0 },
      causeCard: { impressions: 0, seconds: 0, interactions: 0 },
      lobbyHero: { impressions: 0, seconds: 0, interactions: 0 },
      resultSignature: { impressions: 0, seconds: 0, interactions: 0 },
    };

    const deviceMap: Record<string, { impressions: number; seconds: number }> = {
      desktop: { impressions: 0, seconds: 0 },
      tablet: { impressions: 0, seconds: 0 },
      mobile: { impressions: 0, seconds: 0 },
    };

    for (const ev of events) {
      const pEntry = placementMap[ev.placement];
      const dEntry = deviceMap[ev.deviceClass];

      if (ev.eventType === "eligible_load") {
        eligibleSessions += ev.count;
      } else if (ev.eventType === "rendered_impression") {
        renderedImpressions += ev.count;
        if (pEntry) { pEntry.impressions += ev.count; }
        if (dEntry) { dEntry.impressions += ev.count; }
      } else if (ev.eventType === "viewable_seconds") {
        totalViewableSeconds += ev.totalSeconds;
        if (pEntry) { pEntry.seconds += ev.totalSeconds; }
        if (dEntry) { dEntry.seconds += ev.totalSeconds; }
      } else if (ev.eventType === "completed_loop") {
        completedLoops += ev.count;
        if (pEntry) { pEntry.interactions += ev.count; }
      } else if (ev.eventType === "cause_expand") {
        causeExpansions += ev.count;
        if (pEntry) { pEntry.interactions += ev.count; }
      } else if (ev.eventType === "cta_click") {
        ctaClicks += ev.count;
        if (pEntry) { pEntry.interactions += ev.count; }
      }
    }

    const averageViewableSeconds = eligibleSessions > 0 ? Math.round((totalViewableSeconds / eligibleSessions) * 10) / 10 : 0;
    const renderSuccessRate = eligibleSessions > 0 ? Math.min(100, Math.round((renderedImpressions / Math.max(1, eligibleSessions * 2)) * 100)) : 100;
    const clickThroughRate = renderedImpressions > 0 ? Math.round((ctaClicks / renderedImpressions) * 10000) / 100 : 0;

    const placementBreakdown = Object.entries(placementMap).map(([placement, data]) => ({
      placement,
      impressions: data.impressions,
      viewableSeconds: Math.round(data.seconds),
      interactions: data.interactions,
      sharePct: renderedImpressions > 0 ? Math.round((data.impressions / renderedImpressions) * 100) : 0,
    }));

    const deviceBreakdown = Object.entries(deviceMap).map(([device, data]) => ({
      device,
      impressions: data.impressions,
      viewableSeconds: Math.round(data.seconds),
      sharePct: renderedImpressions > 0 ? Math.round((data.impressions / renderedImpressions) * 100) : 0,
    }));

    const anomalies: Array<{ type: "HEALTHY" | "WARNING" | "INFO"; message: string }> = [];
    if (renderSuccessRate >= 95) {
      anomalies.push({ type: "HEALTHY", message: `Render success rate is excellent (${renderSuccessRate}%).` });
    } else if (renderSuccessRate < 80) {
      anomalies.push({ type: "WARNING", message: `Lower render rate observed (${renderSuccessRate}%). Check asset delivery fallbacks.` });
    }

    if (totalViewableSeconds > 0) {
      anomalies.push({ type: "HEALTHY", message: `Active engagement confirmed: ${Math.round(totalViewableSeconds)}s total viewable time.` });
    } else {
      anomalies.push({ type: "INFO", message: "Awaiting live match sessions to accumulate viewable time telemetry." });
    }

    const pacingStatus = campaign?.isPaused ? "PAUSED" : liveVersion ? "ON_TRACK" : "DRAFT";

    return {
      tournament: { id: tournament.id, title: tournament.title, sponsor: tournament.sponsor },
      campaign: campaign ? { id: campaign.id, isPaused: campaign.isPaused, isCausePaused: campaign.isCausePaused } : null,
      liveRevision: liveVersion?.revision ?? null,
      summary: {
        eligibleSessions,
        renderedImpressions,
        totalViewableSeconds: Math.round(totalViewableSeconds),
        averageViewableSeconds,
        renderSuccessRate,
        causeExpansions,
        ctaClicks,
        completedLoops,
        clickThroughRate,
        pacingStatus,
      },
      placementBreakdown,
      deviceBreakdown,
      anomalies,
      proof: {
        campaignTitle: manifest?.identity?.campaignTitle ?? "Untitled Campaign",
        sponsorName: manifest?.identity?.sponsorName ?? tournament.sponsor?.name ?? "House Sponsor",
        disclosureLabel: manifest?.identity?.disclosureLabel ?? "Sponsored by",
        publishedAt: liveVersion?.publishedAt ?? null,
        activateAt: liveVersion?.activateAt ?? null,
        expireAt: liveVersion?.expireAt ?? null,
        hasCause: !!manifest?.cause?.enabled,
        beneficiaryName: manifest?.cause?.beneficiaryName ?? null,
        ctaUrl: manifest?.cause?.ctaUrl ?? null,
      },
    };
  }

  async exportCampaignReportCsv(tournamentId: string, sponsorId?: string) {
    const report = await this.getCampaignReport(tournamentId, sponsorId);
    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: { events: { orderBy: { dateBucket: "desc" } } },
    });

    const rows = [
      ["Date", "Tournament ID", "Tournament Title", "Revision", "Placement", "Device Class", "Event Type", "Count", "Total Seconds"],
    ];

    for (const ev of campaign?.events ?? []) {
      rows.push([
        ev.dateBucket,
        tournamentId,
        `"${report.tournament.title.replace(/"/g, '""')}"`,
        String(ev.revision),
        ev.placement,
        ev.deviceClass,
        ev.eventType,
        String(ev.count),
        String(Math.round(ev.totalSeconds * 10) / 10),
      ]);
    }

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const filename = `sponsor-report-${tournamentId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;

    return { csv: csvContent, filename };
  }
}
