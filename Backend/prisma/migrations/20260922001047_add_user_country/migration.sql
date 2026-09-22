-- Country of the player, ISO 3166-1 alpha-2 (e.g. "PK", "GB"). Chosen at sign-up and shown as a
-- flag on the player's card in the arena. Nullable: existing accounts have no country yet.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2);
