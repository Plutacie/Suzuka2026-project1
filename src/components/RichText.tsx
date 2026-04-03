"use client";

import { useState, type ReactNode } from "react";
import {
  parseRichTextSegments,
  type RichSegment,
} from "@/lib/parse-rich-text";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function SpoilerSpan({
  text,
  variant,
}: {
  text: string;
  variant: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const hidden =
    variant === "light"
      ? "bg-[var(--ink)] text-transparent shadow-inner hover:ring-1 hover:ring-[var(--gold-dim)]/40"
      : "bg-[#070605] text-transparent shadow-inner hover:ring-1 hover:ring-[var(--gold)]/30";
  const revealed =
    variant === "light"
      ? "bg-amber-100/35 text-[var(--ink)]"
      : "bg-white/10 text-[var(--parchment)]";

  return (
    <button
      type="button"
      className={cn(
        "mx-0.5 inline max-w-full rounded px-1 py-0 align-baseline text-left text-sm transition-colors",
        open ? revealed : hidden,
      )}
      aria-label={open ? "点击遮掩" : "点击展开遮掩内容"}
      aria-pressed={open}
      onClick={(e) => {
        e.preventDefault();
        setOpen((v) => !v);
      }}
    >
      <span
        className={cn(
          "whitespace-pre-wrap break-words",
          !open && "select-none",
        )}
      >
        {text || " "}
      </span>
    </button>
  );
}

function renderSegment(
  seg: RichSegment,
  variant: "light" | "dark",
  key: number,
): ReactNode {
  switch (seg.kind) {
    case "text":
      return <span key={key}>{seg.text}</span>;
    case "bold":
      if (!seg.text) return null;
      return (
        <strong key={key} className="font-semibold">
          {seg.text}
        </strong>
      );
    case "strike":
      if (!seg.text) return null;
      return (
        <del key={key} className="opacity-80">
          {seg.text}
        </del>
      );
    case "spoiler":
      return (
        <SpoilerSpan key={key} text={seg.text} variant={variant} />
      );
    default:
      return null;
  }
}

type Props = {
  text: string;
  variant: "light" | "dark";
  /** 块级保留换行；行内置入段落时用 span */
  as?: "div" | "span";
  className?: string;
};

export function RichText({
  text,
  variant,
  as: Tag = "div",
  className,
}: Props) {
  const segments = parseRichTextSegments(text);
  const nodes = segments.map((seg, i) => renderSegment(seg, variant, i));

  return (
    <Tag
      className={cn(
        Tag === "div" && "whitespace-pre-wrap break-words",
        Tag === "span" && "inline whitespace-pre-wrap break-words",
        className,
      )}
    >
      {nodes}
    </Tag>
  );
}
