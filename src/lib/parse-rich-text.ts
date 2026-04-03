export type RichSegment =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "strike"; text: string }
  | { kind: "spoiler"; text: string };

/** 解析 **加粗**、~~删除线~~、||遮掩||（点击展开）；其余原样输出为 text */
export function parseRichTextSegments(input: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let i = 0;
  while (i < input.length) {
    const bold = input.indexOf("**", i);
    const strike = input.indexOf("~~", i);
    const spoil = input.indexOf("||", i);
    const nextBold = bold === -1 ? Infinity : bold;
    const nextStrike = strike === -1 ? Infinity : strike;
    const nextSpoil = spoil === -1 ? Infinity : spoil;
    const min = Math.min(nextBold, nextStrike, nextSpoil);
    if (min === Infinity) {
      if (i < input.length) {
        segments.push({ kind: "text", text: input.slice(i) });
      }
      break;
    }
    if (min > i) {
      segments.push({ kind: "text", text: input.slice(i, min) });
    }
    if (min === nextBold) {
      const end = input.indexOf("**", bold + 2);
      if (end < 0) {
        segments.push({ kind: "text", text: input.slice(bold) });
        break;
      }
      const inner = input.slice(bold + 2, end);
      if (inner.length > 0) {
        segments.push({ kind: "bold", text: inner });
      }
      i = end + 2;
      continue;
    }
    if (min === nextStrike) {
      const end = input.indexOf("~~", strike + 2);
      if (end < 0) {
        segments.push({ kind: "text", text: input.slice(strike) });
        break;
      }
      const inner = input.slice(strike + 2, end);
      if (inner.length > 0) {
        segments.push({ kind: "strike", text: inner });
      }
      i = end + 2;
      continue;
    }
    if (min === nextSpoil) {
      const end = input.indexOf("||", spoil + 2);
      if (end < 0) {
        segments.push({ kind: "text", text: input.slice(spoil) });
        break;
      }
      const inner = input.slice(spoil + 2, end);
      segments.push({ kind: "spoiler", text: inner });
      i = end + 2;
      continue;
    }
    i += 1;
  }
  return segments;
}

export const RICH_TEXT_HINT =
  "格式：**加粗**、~~删除线~~、||遮掩||（点击可展开/收起）";
