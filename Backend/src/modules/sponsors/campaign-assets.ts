export type CampaignAssetKind = "LOGO" | "BACKGROUND_DESKTOP" | "BACKGROUND_MOBILE";

export interface DetectedCampaignFile {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "video/mp4" | "video/webm";
  extension: ".jpg" | ".png" | ".webp" | ".gif" | ".mp4" | ".webm";
  mediaType: "image" | "video";
}

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("ascii");
}

export function detectCampaignFile(buffer: Buffer): DetectedCampaignFile | null {
  if (buffer.length >= 12 && buffer[0] === 0x89 && ascii(buffer, 1, 4) === "PNG") return { mimeType: "image/png", extension: ".png", mediaType: "image" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: "image/jpeg", extension: ".jpg", mediaType: "image" };
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") return { mimeType: "image/webp", extension: ".webp", mediaType: "image" };
  if (buffer.length >= 6 && (ascii(buffer, 0, 6) === "GIF87a" || ascii(buffer, 0, 6) === "GIF89a")) return { mimeType: "image/gif", extension: ".gif", mediaType: "image" };
  if (buffer.length >= 12 && ascii(buffer, 4, 8) === "ftyp") return { mimeType: "video/mp4", extension: ".mp4", mediaType: "video" };
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return { mimeType: "video/webm", extension: ".webm", mediaType: "video" };
  return null;
}

export function acceptsCampaignFile(kind: CampaignAssetKind, file: DetectedCampaignFile): boolean {
  if (kind === "LOGO") return true;
  return file.mediaType === "image" && file.mimeType !== "image/gif";
}
