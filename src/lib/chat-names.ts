/** 访客可认领的有限匿名代号（与数据库占用表配合，互斥） */
export const CHAT_ANONYMOUS_NAMES = [
  "旁听席·甲",
  "旁听席·乙",
  "旁听席·丙",
  "旁听席·丁",
  "侧幕·戊",
  "侧幕·己",
  "灯光·庚",
  "灯光·辛",
  "音响·壬",
  "音响·癸",
  "提词·一",
  "提词·二",
  "场记·三",
  "场记·四",
  "剧务·五",
  "剧务·六",
  "乐池·七",
  "乐池·八",
  "走廊·九",
  "走廊·十",
] as const;

export type ChatAnonymousName = (typeof CHAT_ANONYMOUS_NAMES)[number];

const NAME_SET = new Set<string>(CHAT_ANONYMOUS_NAMES);

export function isValidChatPoolName(name: string): name is ChatAnonymousName {
  return NAME_SET.has(name);
}

export const CHAT_MAX_BODY_LEN = 800;

/** 代号租约时长；前端应在此时间内发 heartbeat */
export const CHAT_HOLD_LEASE_MS = 120_000;
