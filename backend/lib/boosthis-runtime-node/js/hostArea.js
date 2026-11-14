// @ts-nocheck
/* eslint-disable */
// Built from src/hostArea.ts so plain node can run the kit. Do not edit.
const HOST_AREA_UNKNOWN = 0;
const HOST_AREA_UNRECOGNISED = 1;
const HOST_AREA_NA_EAST = 2;
const HOST_AREA_NA_WEST = 3;
const HOST_AREA_NA_CENTRAL = 4;
const HOST_AREA_SOUTH_AMERICA = 5;
const HOST_AREA_EUROPE_WEST = 6;
const HOST_AREA_EUROPE_NORTH = 7;
const HOST_AREA_ASIA_PACIFIC = 8;
const HOST_AREA_INDIA = 9;
const HOST_AREA_MIDDLE_EAST = 10;
const HOST_AREA_AFRICA = 11;
const HOST_AREA_OCEANIA = 12;
const HOST_AREA_MAX = 12;
const REGION_VARS = [
  "VERCEL_REGION",
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "FUNCTION_REGION",
  "GOOGLE_CLOUD_REGION",
  "REGION_NAME",
  "FLY_REGION",
  "RAILWAY_REPLICA_REGION",
  "RENDER_REGION"
];
const AREA_PREFIXES = [
  // AWS / Vercel-on-AWS
  ["us-east", HOST_AREA_NA_EAST],
  ["us-west", HOST_AREA_NA_WEST],
  ["us-central", HOST_AREA_NA_CENTRAL],
  ["ca-central", HOST_AREA_NA_EAST],
  ["ca-west", HOST_AREA_NA_WEST],
  ["sa-east", HOST_AREA_SOUTH_AMERICA],
  ["southamerica-", HOST_AREA_SOUTH_AMERICA],
  ["eu-north", HOST_AREA_EUROPE_NORTH],
  ["eu-", HOST_AREA_EUROPE_WEST],
  ["europe-north", HOST_AREA_EUROPE_NORTH],
  ["europe-", HOST_AREA_EUROPE_WEST],
  ["ap-south-", HOST_AREA_INDIA],
  ["ap-southeast-2", HOST_AREA_OCEANIA],
  ["ap-southeast-4", HOST_AREA_OCEANIA],
  ["ap-", HOST_AREA_ASIA_PACIFIC],
  ["asia-south", HOST_AREA_INDIA],
  ["asia-", HOST_AREA_ASIA_PACIFIC],
  ["australia", HOST_AREA_OCEANIA],
  ["northamerica-northeast", HOST_AREA_NA_EAST],
  ["me-", HOST_AREA_MIDDLE_EAST],
  ["il-", HOST_AREA_MIDDLE_EAST],
  ["af-", HOST_AREA_AFRICA],
  ["africa-", HOST_AREA_AFRICA],
  // Azure's own single-word names
  ["eastus", HOST_AREA_NA_EAST],
  ["westus", HOST_AREA_NA_WEST],
  ["centralus", HOST_AREA_NA_CENTRAL],
  ["northcentralus", HOST_AREA_NA_CENTRAL],
  ["southcentralus", HOST_AREA_NA_CENTRAL],
  ["westcentralus", HOST_AREA_NA_CENTRAL],
  ["canada", HOST_AREA_NA_EAST],
  ["brazil", HOST_AREA_SOUTH_AMERICA],
  ["chile", HOST_AREA_SOUTH_AMERICA],
  ["northeurope", HOST_AREA_EUROPE_WEST],
  ["westeurope", HOST_AREA_EUROPE_WEST],
  ["uk", HOST_AREA_EUROPE_WEST],
  ["france", HOST_AREA_EUROPE_WEST],
  ["germany", HOST_AREA_EUROPE_WEST],
  ["switzerland", HOST_AREA_EUROPE_WEST],
  ["italy", HOST_AREA_EUROPE_WEST],
  ["spain", HOST_AREA_EUROPE_WEST],
  ["poland", HOST_AREA_EUROPE_WEST],
  ["sweden", HOST_AREA_EUROPE_NORTH],
  ["norway", HOST_AREA_EUROPE_NORTH],
  ["eastasia", HOST_AREA_ASIA_PACIFIC],
  ["southeastasia", HOST_AREA_ASIA_PACIFIC],
  ["japan", HOST_AREA_ASIA_PACIFIC],
  ["korea", HOST_AREA_ASIA_PACIFIC],
  ["centralindia", HOST_AREA_INDIA],
  ["southindia", HOST_AREA_INDIA],
  ["westindia", HOST_AREA_INDIA],
  ["jioindia", HOST_AREA_INDIA],
  ["uae", HOST_AREA_MIDDLE_EAST],
  ["qatar", HOST_AREA_MIDDLE_EAST],
  ["israel", HOST_AREA_MIDDLE_EAST],
  ["southafrica", HOST_AREA_AFRICA]
];
const AREA_CODES = {
  iad: HOST_AREA_NA_EAST,
  bos: HOST_AREA_NA_EAST,
  ewr: HOST_AREA_NA_EAST,
  atl: HOST_AREA_NA_EAST,
  mia: HOST_AREA_NA_EAST,
  yyz: HOST_AREA_NA_EAST,
  yul: HOST_AREA_NA_EAST,
  cle: HOST_AREA_NA_CENTRAL,
  ord: HOST_AREA_NA_CENTRAL,
  dfw: HOST_AREA_NA_CENTRAL,
  den: HOST_AREA_NA_CENTRAL,
  qro: HOST_AREA_NA_CENTRAL,
  sfo: HOST_AREA_NA_WEST,
  sjc: HOST_AREA_NA_WEST,
  lax: HOST_AREA_NA_WEST,
  pdx: HOST_AREA_NA_WEST,
  sea: HOST_AREA_NA_WEST,
  phx: HOST_AREA_NA_WEST,
  gru: HOST_AREA_SOUTH_AMERICA,
  gig: HOST_AREA_SOUTH_AMERICA,
  scl: HOST_AREA_SOUTH_AMERICA,
  eze: HOST_AREA_SOUTH_AMERICA,
  bog: HOST_AREA_SOUTH_AMERICA,
  lhr: HOST_AREA_EUROPE_WEST,
  cdg: HOST_AREA_EUROPE_WEST,
  fra: HOST_AREA_EUROPE_WEST,
  ams: HOST_AREA_EUROPE_WEST,
  dub: HOST_AREA_EUROPE_WEST,
  mad: HOST_AREA_EUROPE_WEST,
  waw: HOST_AREA_EUROPE_WEST,
  otp: HOST_AREA_EUROPE_WEST,
  zrh: HOST_AREA_EUROPE_WEST,
  arn: HOST_AREA_EUROPE_NORTH,
  osl: HOST_AREA_EUROPE_NORTH,
  hel: HOST_AREA_EUROPE_NORTH,
  cph: HOST_AREA_EUROPE_NORTH,
  nrt: HOST_AREA_ASIA_PACIFIC,
  hnd: HOST_AREA_ASIA_PACIFIC,
  kix: HOST_AREA_ASIA_PACIFIC,
  icn: HOST_AREA_ASIA_PACIFIC,
  hkg: HOST_AREA_ASIA_PACIFIC,
  sin: HOST_AREA_ASIA_PACIFIC,
  bkk: HOST_AREA_ASIA_PACIFIC,
  bom: HOST_AREA_INDIA,
  maa: HOST_AREA_INDIA,
  del: HOST_AREA_INDIA,
  syd: HOST_AREA_OCEANIA,
  mel: HOST_AREA_OCEANIA,
  akl: HOST_AREA_OCEANIA,
  dxb: HOST_AREA_MIDDLE_EAST,
  bah: HOST_AREA_MIDDLE_EAST,
  tlv: HOST_AREA_MIDDLE_EAST,
  jnb: HOST_AREA_AFRICA,
  cpt: HOST_AREA_AFRICA,
  los: HOST_AREA_AFRICA
};
function areaForRegion(raw) {
  const r = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!r) return HOST_AREA_UNKNOWN;
  for (const [prefix, area] of AREA_PREFIXES) {
    if (r.startsWith(prefix)) return area;
  }
  const code = r.replace(/[0-9]+$/, "");
  if (code.length === 3 && Object.prototype.hasOwnProperty.call(AREA_CODES, code)) {
    return AREA_CODES[code];
  }
  return HOST_AREA_UNRECOGNISED;
}
let cached = null;
function declaredHostArea() {
  if (cached !== null) return cached;
  let area = HOST_AREA_UNKNOWN;
  try {
    for (const name of REGION_VARS) {
      const v = process.env[name];
      if (typeof v !== "string" || v.trim() === "") continue;
      area = areaForRegion(v);
      if (area !== HOST_AREA_UNKNOWN) break;
    }
  } catch {
    area = HOST_AREA_UNKNOWN;
  }
  cached = area;
  return area;
}
const _hostAreaInternals = {
  reset() {
    cached = null;
  }
};
export {
  HOST_AREA_AFRICA,
  HOST_AREA_ASIA_PACIFIC,
  HOST_AREA_EUROPE_NORTH,
  HOST_AREA_EUROPE_WEST,
  HOST_AREA_INDIA,
  HOST_AREA_MAX,
  HOST_AREA_MIDDLE_EAST,
  HOST_AREA_NA_CENTRAL,
  HOST_AREA_NA_EAST,
  HOST_AREA_NA_WEST,
  HOST_AREA_OCEANIA,
  HOST_AREA_SOUTH_AMERICA,
  HOST_AREA_UNKNOWN,
  HOST_AREA_UNRECOGNISED,
  _hostAreaInternals,
  areaForRegion,
  declaredHostArea
};
