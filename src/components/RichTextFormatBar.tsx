"use client";

import type { RefObject } from "react";
import { RICH_TEXT_HINT } from "@/lib/parse-rich-text";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

type Field = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  value: string;
  onChange: (next: string) => void;
  inputRef: RefObject<Field | null>;
  theme: "panel" | "dark";
  disabled?: boolean;
  showHint?: boolean;
};

function wrapSelection(
  el: Field,
  value: string,
  onChange: (next: string) => void,
  before: string,
  after: string,
) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const sel = value.slice(start, end);
  const next =
    value.slice(0, start) + before + sel + after + value.slice(end);
  onChange(next);
  const innerStart = start + before.length;
  const innerEnd = innerStart + sel.length;
  queueMicrotask(() => {
    el.focus();
    el.setSelectionRange(innerStart, innerEnd);
  });
}

const btnPanel =
  "rounded-sm border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--ink-muted)] hover:bg-black/5 disabled:opacity-40";
const btnDark =
  "rounded-sm border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--gold-dim)] hover:bg-white/5 disabled:opacity-40";

export function RichTextFormatBar({
  value,
  onChange,
  inputRef,
  theme,
  disabled,
  showHint = true,
}: Props) {
  const btn = theme === "panel" ? btnPanel : btnDark;
  const hintCls =
    theme === "panel"
      ? "text-[10px] text-[var(--ink-muted)]"
      : "text-[10px] text-[var(--parchment)]/55";

  const run = (before: string, after: string) => {
    const el = inputRef.current;
    if (!el || disabled) return;
    wrapSelection(el, value, onChange, before, after);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => run("**", "**")}
        >
          加粗
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => run("~~", "~~")}
        >
          删除线
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled}
          onClick={() => run("||", "||")}
        >
          遮掩
        </button>
      </div>
      {showHint && <p className={hintCls}>{RICH_TEXT_HINT}</p>}
    </div>
  );
}
