// Creates the ADMIN SANDBOX tournament: a permanent, always-open GROUP event used to exercise the
// real tournament flow (lobby → group game → elimination → rejoin another group) without waiting for
// schedules. Everything is backdated so every group is enterable 24/7.
//
//   node scripts/seed-sandbox.js              # create / recreate it
//   GROUPS=6 node scripts/seed-sandbox.js     # more groups to hop between
//
// Re-running wipes and rebuilds ONLY this tournament — real tournaments are untouched.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const TID = "sandbox-admin-arena"; // fixed id so re-runs replace it
const THEME_ID = "sandbox-lobby";
const GROUPS = Number(process.env.GROUPS || 5);
const PER_GROUP = 31;

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@auroraways.demo" } });
  if (!admin) throw new Error("admin@auroraways.demo not found");

  // A theme carrying a CUSTOM LOBBY so the sandbox also exercises the lobby design.
  const themes = await prisma.platformConfig.findUnique({ where: { key: "themes" } });
  const list = Array.isArray(themes?.value) ? themes.value : [];
  const theme = {
    id: THEME_ID,
    name: "Sandbox Lobby",
    gameTitle: "SANDBOX ARENA",
    subtitle: "Admin test",
    logoUrl: "",
    backgroundImage: "",
    overlayOpacity: 0.4,
    primaryColor: "#35D6E8",
    secondaryColor: "#34D399",
    lobby: {
      backgroundImage: "",
      overlayOpacity: 0.5,
      notice: "SANDBOX — always open. Enter any group, get knocked out, rejoin and go again.",
      bannerImage: "",
    },
  };
  const next = [...list.filter((t) => t && t.id !== THEME_ID), theme];
  await prisma.platformConfig.upsert({
    where: { key: "themes" },
    create: { key: "themes", value: next },
    update: { value: next },
  });

  // Rebuild just this tournament.
  const old = await prisma.sponsorTournament.findUnique({ where: { id: TID } });
  if (old) {
    const gs = await prisma.tournamentGroup.findMany({ where: { tournamentId: TID }, select: { id: true } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: gs.map((g) => g.id) } } });
    await prisma.tournamentGroup.deleteMany({ where: { tournamentId: TID } });
    await prisma.promoEntry.deleteMany({ where: { tournamentId: TID } });
    await prisma.sponsorTournament.delete({ where: { id: TID } });
  }

  const now = new Date();
  const past = new Date(now.getTime() - 5 * 60 * 1000); // every group already "started" ⇒ open 24/7
  const startDate = new Date(now); startDate.setUTCHours(0, 0, 0, 0);
  const botHash = "disabled:" + crypto.randomBytes(16).toString("hex");

  await prisma.sponsorTournament.create({
    data: {
      id: TID,
      title: "[SANDBOX] Admin Test Arena",
      description: "Always-open admin sandbox: enter any group, get eliminated, rejoin another group.",
      type: "GROUP", durationDays: 2, visibility: "PRIVATE", status: "APPROVED",
      startAt: past, startDate, entryClosesAt: now, groupsAssignedAt: now, timeOptions: [],
      minPlayers: 2, maxPlayers: 4000, winnerCount: 1, prizePool: "Test only",
      createdBy: "admin", themeId: THEME_ID,
    },
  });

  // Active "bot:" cows (the server auto-plays these) — a full field in every group.
  const names = ["Daisy 🌸", "Bessie 🐮", "Barnaby 👑", "Nova ✨", "Luna 🌙", "Rusty 🤠", "Moss 🌿", "Clover 🍀"];
  const users = [];
  const perGroupIds = [];
  for (let g = 1; g <= GROUPS; g++) {
    const ids = [];
    // group 1 keeps a free seat for the admin; the rest are full
    const count = g === 1 ? PER_GROUP - 1 : PER_GROUP;
    for (let i = 1; i <= count; i++) {
      const id = `bot:sb-${g}-${i}`;
      ids.push(id);
      users.push({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i}` });
    }
    perGroupIds.push(ids);
  }
  for (let i = 0; i < users.length; i += 1000) {
    await prisma.user.createMany({ data: users.slice(i, i + 1000), skipDuplicates: true });
  }

  // Entries + groups (all backdated so each is playable immediately).
  let seq = 1;
  const entries = [{ tournamentId: TID, userId: admin.id, seq: seq++ }];
  perGroupIds.flat().forEach((id) => entries.push({ tournamentId: TID, userId: id, seq: seq++ }));
  for (let i = 0; i < entries.length; i += 1000) {
    await prisma.promoEntry.createMany({ data: entries.slice(i, i + 1000), skipDuplicates: true });
  }

  for (let g = 1; g <= GROUPS; g++) {
    const group = await prisma.tournamentGroup.create({
      data: { tournamentId: TID, index: g, day: 1, scheduledAt: past, status: "PENDING" },
    });
    const members = perGroupIds[g - 1].map((id, i) => ({ groupId: group.id, userId: id, seat: i + 1 }));
    if (g === 1) members.push({ groupId: group.id, userId: admin.id, seat: PER_GROUP });
    await prisma.groupMember.createMany({ data: members, skipDuplicates: true });
  }
  await prisma.tournamentGroup.create({
    data: { tournamentId: TID, index: GROUPS + 1, isFinal: true, day: 2, scheduledAt: past, status: "PENDING" },
  });

  console.log(`SANDBOX ready: ${GROUPS} groups x ${PER_GROUP} · admin seated in group 1`);
  console.log(`  /events/${TID}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
