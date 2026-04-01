/** 默认头像框：古典金 */
export const DEFAULT_RING_COLOR = "#c9a962";

/** 预设色盘（黑 / 米 / 金 / 酒红 / 墨绿等） */
export const RING_COLOR_SWATCHES = [
  "#c9a962",
  "#d4af37",
  "#e8dcc4",
  "#b8860b",
  "#8b6914",
  "#1a1a1a",
  "#2d2a26",
  "#4a3728",
  "#5c4033",
  "#722f37",
  "#4a1942",
  "#1a3a2f",
  "#2c5282",
  "#3d2914",
  "#6b5344",
  "#c9a090",
] as const;

export function normalizeRingColor(input: string | null | undefined): string {
  if (input == null || typeof input !== "string") return DEFAULT_RING_COLOR;
  const t = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  return DEFAULT_RING_COLOR;
}
