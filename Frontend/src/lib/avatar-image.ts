/**
 * The small copy of an avatar render — the one that should be on screen almost everywhere.
 *
 * The catalog ships 1024x1024 masters at about 1MB each. Every place an avatar actually appears
 * draws it at roughly 60-120 CSS px, so the master is eight times more image than the densest
 * phone screen can show, and five of them is a five-megabyte arena. That is why avatars never
 * arrived on a weak connection, and part of why the game felt heavy on a browser with less memory
 * headroom than Safari: five 1024px images also have to be DECODED before anything is painted.
 *
 * `renders/sm/` holds 384px copies built from the same masters (see scripts/build-avatar-thumbs.mjs):
 * 981 KB -> 18 KB each, 55x smaller, and still 3x the pixels of a 128px slot on a 3x screen.
 *
 * Anything that genuinely needs the master — the catalog studio's large preview — simply does not
 * call this.
 */
export function smallAvatarImage(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  // Only the catalog renders have a small copy; leave every other path alone.
  const marker = "/renders/";
  const i = src.lastIndexOf(marker);
  if (i === -1) return src;
  return `${src.slice(0, i)}${marker}sm/${src.slice(i + marker.length)}`;
}
