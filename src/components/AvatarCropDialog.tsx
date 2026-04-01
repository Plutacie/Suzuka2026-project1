"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob } from "@/lib/crop-image";

type Props = {
  imageSrc: string;
  title?: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export function AvatarCropDialog({
  imageSrc,
  title = "裁剪头像",
  onCancel,
  onDone,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCropComplete = useCallback(
    (_area: Area, pixels: Area) => setCroppedAreaPixels(pixels),
    [],
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) {
      setErr("请稍等图片加载完成");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(
        imageSrc,
        croppedAreaPixels,
        512,
        "image/jpeg",
      );
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onDone(file);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "裁剪失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]">
      <div className="flex w-full max-w-md flex-col rounded-sm border border-[var(--border-subtle)] bg-[var(--panel)] text-[var(--ink)] shadow-2xl shadow-black/40">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-semibold tracking-wide text-[var(--ink)]">
            {title}
          </h3>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            拖动与缩放选区；头像将裁为方形，便于在推演表上呈现。
          </p>
        </div>
        <div className="relative h-72 w-full bg-[var(--void)]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="space-y-2 px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            缩放
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--gold)]"
            />
          </label>
          {err && (
            <p className="text-sm text-red-800 dark:text-red-400">{err}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-4 py-3">
          <button
            type="button"
            className="rounded-sm px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:bg-black/5"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            className={cn(
              "rounded-sm border border-[var(--gold-dim)] bg-[var(--gold)] px-3 py-1.5 text-sm font-medium text-[var(--void)] hover:bg-[var(--gold-bright)]",
              busy && "opacity-60",
            )}
            onClick={() => void handleConfirm()}
          >
            {busy ? "处理中…" : "使用此裁剪"}
          </button>
        </div>
      </div>
    </div>
  );
}
