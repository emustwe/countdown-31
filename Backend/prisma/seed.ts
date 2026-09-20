import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// Safety: this seed creates fixed demo accounts (admin@auroraways.demo / alice@… with known
// passwords). Refuse to run against a production database so those credentials can never be
// created there. In dev/test NODE_ENV is unset, so seeding works exactly as before.
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
  throw new Error("Refusing to run demo seed in production (set ALLOW_PROD_SEED=true to override).");
}

const PLAYER_EMAILS = ["alice@auroraways.demo", "bob@auroraways.demo", "carol@auroraways.demo"];

async function ensureUser(email: string, passwordHash: string, role: "ADMIN" | "PLAYER") {
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, passwordHash, role },
  });
}

// Arcade shop catalog (cosmetics marketplace). Everything is FREE — the `price`/`currency` fields are
// legacy display columns and are ignored by the app. Upserted by stable `key` so re-seeding is safe.
const SHOP_CATALOG: Array<{
  key: string;
  name: string;
  category: string;
  rarity: string;
  price: number;
  currency: string;
  preview: string;
  description: string;
  unlocked?: boolean;
}> = [
  // Skins
  { key: "golden_emperor", name: "Golden Emperor Bull", category: "skins", rarity: "Mythic", price: 0, currency: "free", preview: "/assets/Avatar1.png", description: "Legendary gilded monarch bull with sovereign radiance.", unlocked: true },
  { key: "base_bull", name: "Classic Varsity Bull", category: "skins", rarity: "Common", price: 0, currency: "free", preview: "/assets/Simple Avatar no background.png", description: "The iconic Barnaby varsity athlete bull.", unlocked: true },
  { key: "barnaby", name: "Barnaby Pasture Master", category: "skins", rarity: "Epic", price: 0, currency: "free", preview: "/assets/barnaby/barnaby-field.jpg", description: "The fearless captain of the 31 counting pasture." },
  // Frames
  { key: "mythic_gold", name: "Sovereign Gold Crest", category: "frames", rarity: "Mythic", price: 0, currency: "free", preview: "border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.8)]", description: "Forged from pure pasture gold with radiant corner gems." },
  { key: "neon_glacier", name: "Neon Glacier Frame", category: "frames", rarity: "Epic", price: 0, currency: "free", preview: "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7)]", description: "Sub-zero frozen crystal border with icy pulsations." },
  { key: "inferno", name: "Infernal Volcano Crest", category: "frames", rarity: "Epic", price: 0, currency: "free", preview: "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]", description: "Molten volcanic rock border with burning ember particles." },
  // Skills
  { key: "skill_rewind", name: "Chrono Rewind Pack (x5)", category: "skills", rarity: "Epic", price: 0, currency: "free", preview: "🔄 -2 STEPS", description: "Rewinds live counter by 2 digits during tough countdowns." },
  { key: "skill_turbo", name: "Turbo Leap Pack (x5)", category: "skills", rarity: "Epic", price: 0, currency: "free", preview: "⚡ +3 LEAP", description: "Instantly leaps forward +3 numbers in a surprise rush." },
  { key: "skill_shield", name: "Bovine Barrier (x5)", category: "skills", rarity: "Legendary", price: 0, currency: "free", preview: "🛡️ SHIELD", description: "Grants Divine Shield immunity for 1 turn against blunders." },
  { key: "skill_snooze", name: "Pasture Snooze (x5)", category: "skills", rarity: "Legendary", price: 0, currency: "free", preview: "🌙 SKIP", description: "Safely passes turn to the next player without picking cards." },
];

async function seedShopCatalog(): Promise<void> {
  for (let i = 0; i < SHOP_CATALOG.length; i++) {
    const it = SHOP_CATALOG[i]!;
    const data = {
      name: it.name,
      category: it.category,
      rarity: it.rarity,
      price: it.price,
      currency: it.currency,
      preview: it.preview,
      description: it.description,
      unlocked: it.unlocked ?? false,
      active: true,
      sortOrder: i,
    };
    await prisma.shopCatalogItem.upsert({
      where: { key: it.key },
      update: data,
      create: { key: it.key, ...data },
    });
  }
}

async function main(): Promise<void> {
  // Admin + demo players. No wallets/balances — the game is free and there is no currency.
  const adminPasswordHash = await argon2.hash("Admin123!");
  await ensureUser("admin@auroraways.demo", adminPasswordHash, "ADMIN");

  const playerPasswordHash = await argon2.hash("Player123!");
  for (const email of PLAYER_EMAILS) {
    await ensureUser(email, playerPasswordHash, "PLAYER");
  }

  // Arcade shop catalog (free cosmetics).
  await seedShopCatalog();

  console.log(`Admin + ${PLAYER_EMAILS.length} demo players seeded. Shop catalog: ${SHOP_CATALOG.length} items (all free).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
