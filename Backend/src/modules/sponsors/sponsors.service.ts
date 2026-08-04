import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface SponsorTokenPayload {
  sub: string; // sponsor id
  typ: "sponsor";
  name: string;
}

// Human-friendly generated credentials.
function genUsername(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "sponsor";
  return `${base}-${randomBytes(2).toString("hex")}`;
}
function genPassword(): string {
  // 10 chars, url-safe, no ambiguous look-alikes removed for simplicity.
  return randomBytes(8).toString("base64url").slice(0, 12);
}

@Injectable()
export class SponsorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---- Admin: sponsor accounts ----------------------------------------------------------------
  /** Create a sponsor; returns the generated username + PLAINTEXT password (shown once). */
  async createSponsor(name: string): Promise<{ id: string; name: string; username: string; password: string }> {
    const clean = (name || "").trim();
    if (!clean) throw new BadRequestException("Sponsor name is required");
    let username = genUsername(clean);
    // Ensure uniqueness (retry a few times).
    for (let i = 0; i < 5 && (await this.prisma.sponsor.findUnique({ where: { username } })); i++) username = genUsername(clean);
    const password = genPassword();
    const sponsor = await this.prisma.sponsor.create({
      data: { name: clean, username, passwordHash: await argon2.hash(password) },
    });
    return { id: sponsor.id, name: sponsor.name, username, password };
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
  async login(username: string, password: string): Promise<{ token: string; sponsor: { id: string; name: string; username: string } }> {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { username: (username || "").trim() } });
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

  // ---- Promo (sponsor/new) tournaments --------------------------------------------------------
  async createByAdmin(title: string, description: string, sponsorId: string | null) {
    return this.prisma.sponsorTournament.create({
      data: { title: this.reqTitle(title), description: description ?? "", sponsorId: sponsorId || null, status: "APPROVED", createdBy: "admin" },
    });
  }

  async createBySponsor(sponsorId: string, title: string, description: string) {
    return this.prisma.sponsorTournament.create({
      data: { title: this.reqTitle(title), description: description ?? "", sponsorId, status: "PENDING", createdBy: sponsorId },
    });
  }

  private reqTitle(title: string): string {
    const clean = (title || "").trim();
    if (!clean) throw new BadRequestException("Tournament title is required");
    return clean.slice(0, 80);
  }

  async listAll() {
    const rows = await this.prisma.sponsorTournament.findMany({
      orderBy: { createdAt: "desc" },
      include: { sponsor: { select: { id: true, name: true } } },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      sponsor: t.sponsor ? { id: t.sponsor.id, name: t.sponsor.name } : null,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
    }));
  }

  async listApproved() {
    const rows = await this.prisma.sponsorTournament.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { sponsor: { select: { id: true, name: true } } },
    });
    return rows.map((t) => ({ id: t.id, title: t.title, description: t.description, sponsor: t.sponsor ? { name: t.sponsor.name } : null }));
  }

  async listForSponsor(sponsorId: string) {
    const rows = await this.prisma.sponsorTournament.findMany({ where: { sponsorId }, orderBy: { createdAt: "desc" } });
    return rows.map((t) => ({ id: t.id, title: t.title, description: t.description, status: t.status, createdAt: t.createdAt }));
  }

  async setStatus(id: string, status: "APPROVED" | "REJECTED") {
    return this.prisma.sponsorTournament.update({ where: { id }, data: { status } }).catch(() => {
      throw new NotFoundException("Tournament not found");
    });
  }

  // ---- Admin overview (counts + sponsors + pending) -------------------------------------------
  async overview() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, activeRounds, sponsorCount, pending] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.gameRound.findMany({ where: { createdAt: { gte: since } }, select: { userId: true } }),
      this.prisma.sponsor.count(),
      this.prisma.sponsorTournament.count({ where: { status: "PENDING" } }),
    ]);
    return {
      totalUsers,
      newUsersToday: newToday,
      activeUsers7d: new Set(activeRounds.map((r) => r.userId)).size,
      sponsorCount,
      pendingTournaments: pending,
    };
  }
}
