/**
 * Country list for the sign-up form and the practice name gate, and the flag shown on a player's
 * card in the arena.
 *
 * Only ISO 3166-1 alpha-2 CODES are stored — names come from the browser's own `Intl.DisplayNames`,
 * so the list stays tiny and is localised for free. The flag is built from Unicode regional
 * indicator letters (A→🇦), so there are no image assets and nothing to download.
 */

/** Every ISO 3166-1 alpha-2 code, so nobody is missing from the picker. */
export const COUNTRY_CODES: string[] = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
];

const CODE_RE = /^[A-Za-z]{2}$/;

/** Narrow anything off the wire (or out of storage) to a valid upper-case code, or null. */
export function normalizeCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) && COUNTRY_CODES.includes(code) ? code : null;
}

let displayNames: Intl.DisplayNames | null | undefined;
function regionNames(): Intl.DisplayNames | null {
  if (displayNames !== undefined) return displayNames;
  try {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    // Very old engines have no Intl.DisplayNames — fall back to showing the bare code.
    displayNames = null;
  }
  return displayNames;
}

/** "PK" → "Pakistan". Falls back to the code itself if the browser can't name it. */
export function countryName(code: string | null | undefined): string {
  const c = normalizeCountry(code);
  if (!c) return "";
  return regionNames()?.of(c) ?? c;
}

/**
 * "PK" → "🇵🇰". Built from regional indicator symbols: 'A' (0x41) maps to U+1F1E6, so each letter
 * shifts by a fixed offset and the pair renders as one flag glyph.
 */
export function countryFlag(code: string | null | undefined): string {
  const c = normalizeCountry(code);
  if (!c) return "";
  const OFFSET = 0x1f1e6 - 0x41;
  return String.fromCodePoint(c.charCodeAt(0) + OFFSET, c.charCodeAt(1) + OFFSET);
}

/** The full picker list, sorted by localised name. Memoised — the sort is not free. */
let sorted: { code: string; name: string; flag: string }[] | null = null;
export function countryOptions(): { code: string; name: string; flag: string }[] {
  if (sorted) return sorted;
  sorted = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) || code, flag: countryFlag(code) })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  return sorted;
}
