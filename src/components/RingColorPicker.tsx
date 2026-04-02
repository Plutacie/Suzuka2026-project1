"use client";

import {
  DEFAULT_RING_COLOR,
  RING_COLOR_SWATCHES,
  normalizeRingColor,
} from "@/lib/ring-color";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  colorInputId?: string;
};

export function RingColorPicker({ value, onChange, colorInputId }: Props) {
  const v = normalizeRingColor(value);

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--ink-muted)]">头像边框颜色</p>
      <div className="flex flex-wrap gap-2">
        {RING_COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={cn(
              "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
              v === c
                ? "border-[var(--gold-bright)] shadow-[0_0_0_1px_var(--gold)]"
                : "border-[var(--ink-faint)]",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
        <label
          htmlFor={colorInputId}
          className="text-xs text-[var(--ink-muted)] whitespace-nowrap"
        >
          自选颜色
        </label>
        <input
          id={colorInputId}
          type="color"
          value={v}
          onChange={(e) => onChange(normalizeRingColor(e.target.value))}
          className="h-9 w-16 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--parchment)]"
        />
        <button
          type="button"
          className="text-xs text-[var(--gold)] underline decoration-[var(--gold-dim)] underline-offset-2 hover:text-[var(--gold-bright)]"
          onClick={() => onChange(DEFAULT_RING_COLOR)}
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}
