// Validates a user-supplied avatar URL. Accepts only https images (or a bounded data: image),
// which blocks javascript:/data:text/html and other XSS-via-URL payloads from being stored and
// later rendered. An empty value clears the avatar.
const ALLOWED_IMAGE_DATA = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-zA-Z0-9+/=]+$/;

export function normalizeAvatarUrl(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const v = String(input).trim();
  if (!v) return null;
  if (v.length > 512 * 1024) throw new Error("Avatar image is too large");
  if (ALLOWED_IMAGE_DATA.test(v)) return v; // small inline uploads are fine
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new Error("Avatar must be a valid https image URL");
  }
  if (url.protocol !== "https:") throw new Error("Avatar URL must use https");
  return url.toString();
}
