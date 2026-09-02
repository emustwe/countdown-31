import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";
import { encryptSecret } from "../../common/crypto/secret-box";
import {
  CAMPAIGN_PRESETS,
  MOOMORROW_MANIFEST,
  defaultManifest,
  normalizeManifest,
  type TournamentCampaignManifest,
} from "./campaign-presets";

// ---- Local types -----------------------------------------------------------------------------------
// @types/multer isn't installed; declare only the fields we touch. FileInterceptor uses memory storage
// by default, so `buffer` is populated.
export interface UploadedCampaignFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type AssetKind = "LOGO" | "BACKGROUND_DESKTOP" | "BACKGROUND_MOBILE";
const ASSET_KINDS: readonly AssetKind[] = ["LOGO", "BACKGROUND_DESKTOP", "BACKGROUND_MOBILE"];

// mime -> [extension, mediaType]
const MIME_WHITELIST: Record<string, { ext: string; mediaType: "image" | "video" }> = {
  "image/png": { ext: "png", mediaType: "image" },
  "image/jpeg": { ext: "jpg", mediaType: "image" },
  "image/webp": { ext: "webp", mediaType: "image" },
  "image/svg+xml": { ext: "svg", mediaType: "image" },
  "video/mp4": { ext: "mp4", mediaType: "video" },
};
export const CAMPAIGN_UPLOAD_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const DRAFT_STATES = ["DRAFT", "IN_REVIEW"] as const;

// Prisma payload shape for a version with its reviews.
type VersionWithReviews = Prisma.TournamentCampaignVersionGetPayload<{ include: { reviews: true } }>;
type CampaignWithVersions = Prisma.TournamentCampaignGetPayload<{
  include: { versions: { include: { reviews: true } } };
}>;

interface EventInput {
  placement?: unknown;
  eventType?: unknown;
  count?: unknown;
  seconds?: unknown;
}

function genPassword(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

/** Today as a UTC YYYY-MM-DD string. */
function todayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoOrNull(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asJson(manifest: TournamentCampaignManifest): Prisma.InputJsonValue {
  return manifest as unknown as Prisma.InputJsonValue;
}

/** RFC-4180 CSV field escaping. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class TournamentCampaignService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedPresets().catch(() => {
      // Seeding is best-effort; never block app boot on it.
    });
  }

  // ---- Preset seeding -------------------------------------------------------------------------
  async seedPresets(): Promise<void> {
    for (const p of CAMPAIGN_PRESETS) {
      await this.prisma.tournamentCampaignTemplate.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          name: p.name,
          category: p.category,
          badge: p.badge,
          description: p.description,
          manifest: asJson(p.manifest),
          isPreset: true,
          createdBy: null,
        },
        update: {
          name: p.name,
          category: p.category,
          badge: p.badge,
          description: p.description,
          manifest: asJson(p.manifest),
          isPreset: true,
        },
      });
    }
  }

  // ---- Public: active campaign for the play screen --------------------------------------------
  async getActive(tournamentId: string): Promise<{
    campaign:
      | null
      | {
          tournamentId: string;
          tournamentTitle: string;
          revision: number;
          manifest: TournamentCampaignManifest;
          isCausePaused: boolean;
          activateAt: Date | null;
          expireAt: Date | null;
        };
  }> {
    const campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: { tournament: { select: { title: true } } },
    });
    if (!campaign || campaign.isPaused) return { campaign: null };

    const now = new Date();
    const published = await this.prisma.tournamentCampaignVersion.findMany({
      where: {
        campaignId: campaign.id,
        status: "PUBLISHED",
        AND: [
          { OR: [{ activateAt: null }, { activateAt: { lte: now } }] },
          { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { revision: "desc" }],
      take: 1,
    });
    const v = published[0];
    if (!v) return { campaign: null };

    return {
      campaign: {
        tournamentId,
        tournamentTitle: campaign.tournament?.title ?? "",
        revision: v.revision,
        manifest: normalizeManifest(v.manifest),
        isCausePaused: campaign.isCausePaused,
        activateAt: v.activateAt,
        expireAt: v.expireAt,
      },
    };
  }

  // ---- Public: telemetry ingest (best-effort, never throws) -----------------------------------
  async recordEvents(tournamentId: string, body: unknown): Promise<{ ok: true }> {
    try {
      const b = (body ?? {}) as { revision?: unknown; deviceClass?: unknown; events?: unknown };
      const campaign = await this.prisma.tournamentCampaign.findUnique({ where: { tournamentId }, select: { id: true } });
      if (!campaign) return { ok: true };

      const revision = Number.isFinite(Number(b.revision)) ? Math.trunc(Number(b.revision)) : 1;
      const deviceClass = (typeof b.deviceClass === "string" && b.deviceClass ? b.deviceClass : "unknown").slice(0, 40);
      const events = Array.isArray(b.events) ? (b.events as EventInput[]) : [];
      const dateBucket = todayBucket();

      for (const ev of events) {
        const placement = typeof ev?.placement === "string" && ev.placement ? ev.placement.slice(0, 60) : null;
        const eventType = typeof ev?.eventType === "string" && ev.eventType ? ev.eventType.slice(0, 60) : null;
        if (!placement || !eventType) continue;
        const countN = Number(ev?.count);
        const secondsN = Number(ev?.seconds);
        const inc = Number.isFinite(countN) && countN > 0 ? Math.trunc(countN) : 1;
        const secs = Number.isFinite(secondsN) && secondsN > 0 ? secondsN : 0;

        await this.prisma.tournamentCampaignEventAggregate
          .upsert({
            where: {
              campaignId_revision_placement_deviceClass_eventType_dateBucket: {
                campaignId: campaign.id,
                revision,
                placement,
                deviceClass,
                eventType,
                dateBucket,
              },
            },
            create: {
              campaignId: campaign.id,
              tournamentId,
              revision,
              placement,
              deviceClass,
              eventType,
              count: inc,
              totalSeconds: secs,
              dateBucket,
            },
            update: {
              count: { increment: inc },
              totalSeconds: { increment: secs },
            },
          })
          .catch(() => undefined);
      }
    } catch {
      // best-effort — swallow everything.
    }
    return { ok: true };
  }

  // ---- Admin: load / auto-create --------------------------------------------------------------
  private async ensureCampaign(tournamentId: string): Promise<CampaignWithVersions> {
    const tournament = await this.prisma.sponsorTournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
    if (!tournament) throw new NotFoundException("Tournament not found");

    let campaign = await this.prisma.tournamentCampaign.findUnique({
      where: { tournamentId },
      include: { versions: { include: { reviews: true } } },
    });
    if (!campaign) {
      await this.prisma.tournamentCampaign.create({ data: { tournamentId } });
      campaign = await this.prisma.tournamentCampaign.findUnique({
        where: { tournamentId },
        include: { versions: { include: { reviews: true } } },
      });
    }
    if (!campaign) throw new NotFoundException("Campaign not found");

    if (campaign.versions.length === 0) {
      await this.prisma.tournamentCampaignVersion.create({
        data: {
          campaignId: campaign.id,
          revision: 1,
          status: "DRAFT",
          manifest: asJson(defaultManifest()),
          createdBy: "system",
        },
      });
      campaign = await this.prisma.tournamentCampaign.findUnique({
        where: { tournamentId },
        include: { versions: { include: { reviews: true } } },
      });
    }
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  private serializeVersion(v: VersionWithReviews) {
    const reviews = [...v.reviews].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return {
      id: v.id,
      revision: v.revision,
      status: v.status,
      manifest: normalizeManifest(v.manifest),
      createdAt: v.createdAt,
      publishedAt: v.publishedAt,
      approvedBy: v.approvedBy,
      approvedAt: v.approvedAt,
      activateAt: v.activateAt,
      expireAt: v.expireAt,
      reviews: reviews.map((r) => ({
        id: r.id,
        reviewerId: r.reviewerId,
        lane: r.lane,
        decision: r.decision,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };
  }

  /** Build the full admin GET shape for a tournament (auto-creating the campaign if needed). */
  async getAdminView(tournamentId: string) {
    const tournament = await this.prisma.sponsorTournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, title: true, sponsor: { select: { id: true, name: true } } },
    });
    if (!tournament) throw new NotFoundException("Tournament not found");

    const campaign = await this.ensureCampaign(tournamentId);
    const versionsDesc = [...campaign.versions].sort((a, b) => b.revision - a.revision);
    const draftVersion = versionsDesc.find((v) => (DRAFT_STATES as readonly string[]).includes(v.status)) ?? null;
    const publishedVersion = versionsDesc.find((v) => v.status === "PUBLISHED") ?? null;

    return {
      tournament: {
        id: tournament.id,
        title: tournament.title,
        sponsor: tournament.sponsor ? { id: tournament.sponsor.id, name: tournament.sponsor.name } : null,
      },
      campaign: {
        id: campaign.id,
        isPaused: campaign.isPaused,
        isCausePaused: campaign.isCausePaused,
        draft: draftVersion ? this.serializeVersion(draftVersion) : null,
        published: publishedVersion ? this.serializeVersion(publishedVersion) : null,
        versions: versionsDesc.map((v) => this.serializeVersion(v)),
      },
    };
  }

  // ---- Admin: draft editing -------------------------------------------------------------------
  async saveDraft(tournamentId: string, body: unknown) {
    const campaign = await this.ensureCampaign(tournamentId);
    const manifest = normalizeManifest((body as { manifest?: unknown })?.manifest);
    const versionsDesc = [...campaign.versions].sort((a, b) => b.revision - a.revision);
    const latest = versionsDesc[0]!; // ensureCampaign guarantees ≥1 version
    const maxRevision = latest.revision;

    if (latest.status === "DRAFT") {
      await this.prisma.tournamentCampaignVersion.update({
        where: { id: latest.id },
        data: { manifest: asJson(manifest) },
      });
    } else {
      // Latest is locked (IN_REVIEW/APPROVED/PUBLISHED/ARCHIVED) → fork a fresh draft.
      await this.prisma.tournamentCampaignVersion.create({
        data: {
          campaignId: campaign.id,
          revision: maxRevision + 1,
          status: "DRAFT",
          manifest: asJson(manifest),
          createdBy: "admin",
        },
      });
    }
    return this.getAdminView(tournamentId);
  }

  // ---- Admin: assets --------------------------------------------------------------------------
  private serializeAsset(a: {
    id: string;
    kind: string;
    url: string;
    originalName: string;
    mimeType: string;
    mediaType: string;
    bytes: number;
    supersedesId: string | null;
    archivedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: a.id,
      kind: a.kind,
      url: a.url,
      originalName: a.originalName,
      mimeType: a.mimeType,
      mediaType: a.mediaType,
      bytes: a.bytes,
      supersedesId: a.supersedesId,
      archivedAt: a.archivedAt,
      createdAt: a.createdAt,
    };
  }

  private async loadAssets(campaignId: string) {
    const rows = await this.prisma.tournamentCampaignAsset.findMany({
      where: { campaignId },
      // Non-archived first, then newest first.
      orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    });
    // Prisma sorts nulls last for asc; we want archivedAt=null (active) FIRST → split & concat.
    const active = rows.filter((r) => r.archivedAt === null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const archived = rows.filter((r) => r.archivedAt !== null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return [...active, ...archived].map((r) => this.serializeAsset(r));
  }

  async listAssets(tournamentId: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    return { assets: await this.loadAssets(campaign.id) };
  }

  async uploadAsset(tournamentId: string, kindRaw: string, file: UploadedCampaignFile | undefined, createdBy: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    const kind = kindRaw as AssetKind;
    if (!(ASSET_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException("Invalid asset kind");
    }
    if (!file) throw new BadRequestException("No file uploaded");
    const spec = MIME_WHITELIST[file.mimetype];
    if (!spec) throw new BadRequestException("Unsupported file type");
    if (file.size > CAMPAIGN_UPLOAD_MAX_BYTES) throw new BadRequestException("File too large (max 20MB)");

    const dir = join(process.cwd(), "uploads", "campaigns", tournamentId);
    await mkdir(dir, { recursive: true });
    const fileName = `${randomUUID()}.${spec.ext}`;
    const absPath = join(dir, fileName);
    await writeFile(absPath, file.buffer);
    const url = `/uploads/campaigns/${tournamentId}/${fileName}`;

    // Archive the current same-kind asset (supersede chain).
    const previous = await this.prisma.tournamentCampaignAsset.findFirst({
      where: { campaignId: campaign.id, kind, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (previous) {
      await this.prisma.tournamentCampaignAsset.update({ where: { id: previous.id }, data: { archivedAt: new Date() } });
    }

    const asset = await this.prisma.tournamentCampaignAsset.create({
      data: {
        campaignId: campaign.id,
        kind,
        url,
        storagePath: absPath,
        originalName: (file.originalname || "").slice(0, 200),
        mimeType: file.mimetype,
        mediaType: spec.mediaType,
        bytes: file.size,
        createdBy,
        supersedesId: previous?.id ?? null,
      },
    });
    return { asset: this.serializeAsset(asset), assets: await this.loadAssets(campaign.id) };
  }

  // ---- Admin: review workflow -----------------------------------------------------------------
  async submitReview(tournamentId: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    const versionsDesc = [...campaign.versions].sort((a, b) => b.revision - a.revision);
    const draft = versionsDesc.find((v) => v.status === "DRAFT");
    if (!draft) throw new BadRequestException("No draft to submit for review");
    await this.prisma.tournamentCampaignVersion.update({ where: { id: draft.id }, data: { status: "IN_REVIEW" } });
    return this.getAdminView(tournamentId);
  }

  async addReview(tournamentId: string, versionId: string, body: unknown, reviewerId: string) {
    await this.ensureCampaign(tournamentId);
    const b = (body ?? {}) as { lane?: unknown; decision?: unknown; comment?: unknown };
    const lane = b.lane === "SAFETY" ? "SAFETY" : b.lane === "BRAND" ? "BRAND" : null;
    if (!lane) throw new BadRequestException("lane must be BRAND or SAFETY");
    const decision =
      b.decision === "APPROVED" ? "APPROVED" : b.decision === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : b.decision === "COMMENT" ? "COMMENT" : null;
    if (!decision) throw new BadRequestException("decision must be COMMENT, APPROVED or CHANGES_REQUESTED");
    const comment = typeof b.comment === "string" ? b.comment.slice(0, 2000) : "";

    const version = await this.prisma.tournamentCampaignVersion.findUnique({ where: { id: versionId } });
    if (!version || version.campaignId !== (await this.campaignIdFor(tournamentId))) {
      throw new NotFoundException("Version not found");
    }

    await this.prisma.tournamentCampaignReview.create({
      data: { versionId, reviewerId, lane, decision, comment },
    });

    // Both lanes approved → auto-advance to APPROVED (unless already published/archived).
    const reviews = await this.prisma.tournamentCampaignReview.findMany({ where: { versionId } });
    const brandOk = reviews.some((r) => r.lane === "BRAND" && r.decision === "APPROVED");
    const safetyOk = reviews.some((r) => r.lane === "SAFETY" && r.decision === "APPROVED");
    if (brandOk && safetyOk && !["PUBLISHED", "ARCHIVED", "APPROVED"].includes(version.status)) {
      await this.prisma.tournamentCampaignVersion.update({
        where: { id: versionId },
        data: { status: "APPROVED", approvedBy: reviewerId, approvedAt: new Date() },
      });
    }
    return this.getAdminView(tournamentId);
  }

  private async campaignIdFor(tournamentId: string): Promise<string> {
    const c = await this.prisma.tournamentCampaign.findUnique({ where: { tournamentId }, select: { id: true } });
    if (!c) throw new NotFoundException("Campaign not found");
    return c.id;
  }

  // ---- Admin: publish / rollback --------------------------------------------------------------
  async publish(tournamentId: string, body: unknown) {
    const campaign = await this.ensureCampaign(tournamentId);
    const b = (body ?? {}) as { activateAt?: unknown; expireAt?: unknown };
    const versionsDesc = [...campaign.versions].sort((a, b2) => b2.revision - a.revision);

    // Prefer the newest APPROVED head; else the newest DRAFT/IN_REVIEW.
    const head =
      versionsDesc.find((v) => v.status === "APPROVED") ??
      versionsDesc.find((v) => (DRAFT_STATES as readonly string[]).includes(v.status));
    if (!head) throw new BadRequestException("No version available to publish");

    const activateAt = parseIsoOrNull(b.activateAt);
    const expireAt = parseIsoOrNull(b.expireAt);

    // Archive any other currently-published version.
    await this.prisma.tournamentCampaignVersion.updateMany({
      where: { campaignId: campaign.id, status: "PUBLISHED", NOT: { id: head.id } },
      data: { status: "ARCHIVED" },
    });
    await this.prisma.tournamentCampaignVersion.update({
      where: { id: head.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), activateAt, expireAt },
    });
    return this.getAdminView(tournamentId);
  }

  async rollback(tournamentId: string, versionId: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    const source = campaign.versions.find((v) => v.id === versionId);
    if (!source) throw new NotFoundException("Version not found");
    const maxRevision = campaign.versions.reduce((m, v) => Math.max(m, v.revision), 0);

    // Archive any currently-published version, then publish a fresh clone.
    await this.prisma.tournamentCampaignVersion.updateMany({
      where: { campaignId: campaign.id, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
    await this.prisma.tournamentCampaignVersion.create({
      data: {
        campaignId: campaign.id,
        revision: maxRevision + 1,
        status: "PUBLISHED",
        manifest: asJson(normalizeManifest(source.manifest)),
        createdBy: "admin",
        publishedAt: new Date(),
      },
    });
    return this.getAdminView(tournamentId);
  }

  // ---- Admin: kill switches -------------------------------------------------------------------
  async setPaused(tournamentId: string, isPaused: boolean) {
    const campaign = await this.ensureCampaign(tournamentId);
    await this.prisma.tournamentCampaign.update({ where: { id: campaign.id }, data: { isPaused } });
    return { ok: true as const, isPaused };
  }

  async setCausePaused(tournamentId: string, isCausePaused: boolean) {
    const campaign = await this.ensureCampaign(tournamentId);
    await this.prisma.tournamentCampaign.update({ where: { id: campaign.id }, data: { isCausePaused } });
    return { ok: true as const, isCausePaused };
  }

  // ---- Admin: reporting -----------------------------------------------------------------------
  private async loadEventRows(campaignId: string) {
    return this.prisma.tournamentCampaignEventAggregate.findMany({ where: { campaignId } });
  }

  async getReport(tournamentId: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    const rows = await this.loadEventRows(campaign.id);

    const totals = { eligibleSessions: 0, renderedImpressions: 0, viewableSeconds: 0, causeExpansions: 0, ctaClicks: 0 };
    const byPlacement = new Map<string, { impressions: number; viewableSeconds: number; interactions: number }>();
    const byDevice = new Map<string, number>();
    const daily = new Map<string, { impressions: number; viewableSeconds: number }>();

    const placement = (k: string) => {
      let e = byPlacement.get(k);
      if (!e) byPlacement.set(k, (e = { impressions: 0, viewableSeconds: 0, interactions: 0 }));
      return e;
    };
    const day = (k: string) => {
      let e = daily.get(k);
      if (!e) daily.set(k, (e = { impressions: 0, viewableSeconds: 0 }));
      return e;
    };

    for (const r of rows) {
      switch (r.eventType) {
        case "eligible_load":
          totals.eligibleSessions += r.count;
          break;
        case "rendered_impression":
          totals.renderedImpressions += r.count;
          placement(r.placement).impressions += r.count;
          byDevice.set(r.deviceClass, (byDevice.get(r.deviceClass) ?? 0) + r.count);
          day(r.dateBucket).impressions += r.count;
          break;
        case "viewable_seconds":
          totals.viewableSeconds += r.totalSeconds;
          placement(r.placement).viewableSeconds += r.totalSeconds;
          day(r.dateBucket).viewableSeconds += r.totalSeconds;
          break;
        case "cause_expand":
          totals.causeExpansions += r.count;
          placement(r.placement).interactions += r.count;
          break;
        case "cta_click":
          totals.ctaClicks += r.count;
          placement(r.placement).interactions += r.count;
          break;
        default:
          break;
      }
    }

    const totalImpressions = totals.renderedImpressions;
    return {
      totals,
      byPlacement: [...byPlacement.entries()].map(([placementName, v]) => ({
        placement: placementName,
        impressions: v.impressions,
        viewableSeconds: v.viewableSeconds,
        interactions: v.interactions,
        sharePct: totalImpressions > 0 ? (v.impressions / totalImpressions) * 100 : 0,
      })),
      byDevice: [...byDevice.entries()].map(([deviceClass, impressions]) => ({ deviceClass, impressions })),
      daily: [...daily.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, impressions: v.impressions, viewableSeconds: v.viewableSeconds })),
    };
  }

  async exportReport(tournamentId: string) {
    const campaign = await this.ensureCampaign(tournamentId);
    const rows = await this.loadEventRows(campaign.id);

    // Group by (date, revision, placement, device).
    const groups = new Map<string, { date: string; revision: number; placement: string; device: string; impressions: number; viewableSeconds: number; interactions: number }>();
    for (const r of rows) {
      const key = `${r.dateBucket}|${r.revision}|${r.placement}|${r.deviceClass}`;
      let g = groups.get(key);
      if (!g) {
        groups.set(key, (g = { date: r.dateBucket, revision: r.revision, placement: r.placement, device: r.deviceClass, impressions: 0, viewableSeconds: 0, interactions: 0 }));
      }
      if (r.eventType === "rendered_impression") g.impressions += r.count;
      else if (r.eventType === "viewable_seconds") g.viewableSeconds += r.totalSeconds;
      else if (r.eventType === "cause_expand" || r.eventType === "cta_click") g.interactions += r.count;
    }

    const header = ["Date", "Revision", "Placement", "Device", "Impressions", "ViewableSeconds", "Interactions"];
    const lines = [header.map(csvField).join(",")];
    const sorted = [...groups.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.revision - b.revision || a.placement.localeCompare(b.placement) || a.device.localeCompare(b.device),
    );
    for (const g of sorted) {
      lines.push([g.date, g.revision, g.placement, g.device, g.impressions, g.viewableSeconds, g.interactions].map(csvField).join(","));
    }
    const csv = lines.join("\r\n");
    return { csv, filename: `campaign-${tournamentId}-report.csv` };
  }

  // ---- Admin: demo setup ----------------------------------------------------------------------
  async demoSetup() {
    const password = genPassword();
    const passwordHash = await argon2.hash(password);
    const sponsor = await this.prisma.sponsor.upsert({
      where: { username: "moomorrow-demo" },
      create: { name: "Moomorrow Farms", username: "moomorrow-demo", passwordHash, passwordEnc: encryptSecret(password) },
      update: { name: "Moomorrow Farms", passwordHash, passwordEnc: encryptSecret(password) },
    });

    // Reuse an existing demo tournament for this sponsor if present, else create one.
    let tournament = await this.prisma.sponsorTournament.findFirst({
      where: { sponsorId: sponsor.id, title: "Moomorrow Cup 2026" },
      select: { id: true, title: true },
    });
    if (!tournament) {
      const created = await this.prisma.sponsorTournament.create({
        data: {
          title: "Moomorrow Cup 2026",
          visibility: "PUBLIC",
          status: "APPROVED",
          createdBy: "admin",
          startAt: new Date(),
          prizePool: "5,000 USDT",
          winnerCount: 3,
          sponsor: { connect: { id: sponsor.id } },
        },
        select: { id: true, title: true },
      });
      tournament = created;
    }

    // Ensure the campaign + a PUBLISHED revision-1 exist.
    const campaign = await this.prisma.tournamentCampaign.upsert({
      where: { tournamentId: tournament.id },
      create: { tournamentId: tournament.id },
      update: {},
      include: { versions: true },
    });
    const hasRev1 = campaign.versions.some((v) => v.revision === 1);
    if (!hasRev1) {
      await this.prisma.tournamentCampaignVersion.create({
        data: {
          campaignId: campaign.id,
          revision: 1,
          status: "PUBLISHED",
          manifest: asJson(MOOMORROW_MANIFEST),
          createdBy: "admin",
          publishedAt: new Date(),
        },
      });
    }

    return {
      sponsor: { id: sponsor.id, name: sponsor.name, username: sponsor.username, password },
      tournament: { id: tournament.id, title: tournament.title },
      revision: 1 as const,
    };
  }

  // ---- Scheduler: activate scheduled publishes ------------------------------------------------
  @Interval(60000)
  async activateScheduled(): Promise<void> {
    try {
      const now = new Date();
      // APPROVED versions whose scheduled activation time has passed become PUBLISHED. Idempotent:
      // once promoted they no longer match. Archives any older published version in the same campaign.
      const due = await this.prisma.tournamentCampaignVersion.findMany({
        where: { status: "APPROVED", activateAt: { not: null, lte: now } },
        select: { id: true, campaignId: true },
      });
      for (const v of due) {
        await this.prisma.tournamentCampaignVersion
          .updateMany({
            where: { campaignId: v.campaignId, status: "PUBLISHED", NOT: { id: v.id } },
            data: { status: "ARCHIVED" },
          })
          .catch(() => undefined);
        await this.prisma.tournamentCampaignVersion
          .update({ where: { id: v.id }, data: { status: "PUBLISHED", publishedAt: now } })
          .catch(() => undefined);
      }
    } catch {
      // no-op-safe
    }
  }
}
