"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichText } from "@/components/RichText";
import { RichTextFormatBar } from "@/components/RichTextFormatBar";
import {
  getSitePassword,
  setSitePassword,
  sitePasswordHeaders,
} from "@/lib/api-helpers";
import { RICH_TEXT_HINT } from "@/lib/parse-rich-text";
import {
  MOE_TAG_MAX_LABEL,
  MOE_TAG_MAX_REASON,
} from "@/lib/moe-tags";
import { normalizeRingColor } from "@/lib/ring-color";
import type { GraphNode, GraphPayload } from "@/types/graph";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const btnPrimary =
  "rounded-sm border border-[var(--gold-dim)] bg-gradient-to-b from-[#d4b870] to-[#a68540] px-3 py-1.5 text-xs font-semibold text-[var(--void)] shadow-sm hover:from-[#e8c878] hover:to-[#c9a962]";
const btnGhost =
  "rounded-sm border border-[var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs text-[var(--parchment)] hover:bg-white/5";
const inputClass =
  "mt-1 w-full rounded-sm border border-[var(--border-subtle)] bg-[#141210] px-2 py-1.5 text-sm text-[var(--parchment)] outline-none focus:border-[var(--gold)]";
const labelClass = "text-xs text-[var(--gold-dim)]";

export default function MoeTagsPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [characterId, setCharacterId] = useState("");
  const [label, setLabel] = useState("");
  const [reason, setReason] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [sitePwInput, setSitePwInput] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSitePwInput(getSitePassword());
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch("/api/graph");
      const data = (await res.json()) as GraphPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      const next = data.nodes.map((n) => ({
        ...n,
        ringColor: normalizeRingColor(n.ringColor),
        moeTags: n.moeTags ?? [],
      }));
      setNodes(next);
      setCharacterId((prev) => {
        if (prev && next.some((n) => n.id === prev)) return prev;
        return next[0]?.id ?? "";
      });
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const applySitePassword = () => {
    setSitePassword(sitePwInput.trim());
  };

  const selected = nodes.find((n) => n.id === characterId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    if (!characterId) {
      setSubmitErr("请先选择角色");
      return;
    }
    const t = label.trim();
    if (!t) {
      setSubmitErr("请填写标签内容");
      return;
    }
    setSubmitBusy(true);
    try {
      const res = await fetch(`/api/characters/${characterId}/moe-tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sitePasswordHeaders(),
        },
        body: JSON.stringify({ label: t, reason: reason.trim() }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "提交失败");
      setLabel("");
      setReason("");
      await loadGraph();
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col text-[var(--parchment)]">
      <header className="flex flex-shrink-0 flex-col gap-2 border-b border-[var(--border-subtle)] bg-[var(--panel-dark)] px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.35em] text-[var(--gold-dim)]">
            Suzuka 2026
          </p>
          <h1 className="font-display text-lg font-semibold text-[var(--parchment)]">
            萌属性标签
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--gold)]/90">
            为每个角色添加自定义 tag，并写下理由
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
            站点密码
            <input
              type="password"
              autoComplete="off"
              value={sitePwInput}
              onChange={(e) => setSitePwInput(e.target.value)}
              onBlur={applySitePassword}
              className="w-24 rounded-sm border border-[var(--border-subtle)] bg-[#141210] px-1.5 py-0.5 text-[11px] text-[var(--parchment)]"
              placeholder="可选"
            />
          </label>
          <Link href="/" className={btnGhost}>
            返回关系图
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 p-4">
        {loading && (
          <p className="text-sm text-[var(--gold-dim)]">加载角色列表…</p>
        )}
        {loadErr && (
          <div className="rounded-sm border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
            {loadErr}
            <button
              type="button"
              className={cn(btnPrimary, "mt-2")}
              onClick={() => void loadGraph()}
            >
              重试
            </button>
          </div>
        )}
        {!loading && !loadErr && nodes.length === 0 && (
          <p className="text-sm text-[var(--ink-muted)]">
            还没有角色，请先在关系图页添加角色。
          </p>
        )}
        {!loading && !loadErr && nodes.length > 0 && (
          <div className="space-y-6">
            <section className="rounded-sm border border-[var(--border-subtle)] bg-[var(--panel-dark)] p-4">
              <h2 className="font-display text-base font-semibold text-[var(--parchment)]">
                添加标签
              </h2>
              <p className="mt-2 text-[10px] text-[var(--parchment)]/55">
                {RICH_TEXT_HINT}
              </p>
              <form onSubmit={submit} className="mt-4 space-y-3">
                <label className="block">
                  <span className={labelClass}>角色</span>
                  <select
                    className={inputClass}
                    value={characterId}
                    onChange={(e) => setCharacterId(e.target.value)}
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>
                    萌属性 tag（最多 {MOE_TAG_MAX_LABEL} 字）
                  </span>
                  <div className="mt-1">
                    <RichTextFormatBar
                      value={label}
                      onChange={setLabel}
                      inputRef={labelRef}
                      theme="dark"
                      showHint={false}
                    />
                  </div>
                  <input
                    ref={labelRef}
                    className={inputClass}
                    value={label}
                    maxLength={MOE_TAG_MAX_LABEL}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例如：傲娇、无口、姐系…"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>
                    理由（最多 {MOE_TAG_MAX_REASON} 字，建议填写）
                  </span>
                  <div className="mt-1">
                    <RichTextFormatBar
                      value={reason}
                      onChange={setReason}
                      inputRef={reasonRef}
                      theme="dark"
                      showHint={false}
                    />
                  </div>
                  <textarea
                    ref={reasonRef}
                    className={cn(inputClass, "min-h-[100px] resize-y")}
                    value={reason}
                    maxLength={MOE_TAG_MAX_REASON}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="为什么觉得 Ta 有这个属性？"
                  />
                </label>
                {submitErr && (
                  <p className="text-sm text-red-300">{submitErr}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submitBusy}
                    className={cn(btnPrimary, submitBusy && "opacity-60")}
                  >
                    {submitBusy ? "提交中…" : "提交标签"}
                  </button>
                </div>
              </form>
            </section>

            {selected && (
              <section className="rounded-sm border border-[var(--border-subtle)] bg-[var(--panel-dark)] p-4">
                <h2 className="font-display text-base font-semibold text-[var(--parchment)]">
                  「{selected.name}」已有标签
                </h2>
                {(selected.moeTags ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--parchment)]/70">
                    还没有人添加标签。
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {(selected.moeTags ?? []).map((t) => (
                      <li
                        key={t.id}
                        className="rounded-sm border border-[var(--border-subtle)]/60 bg-black/25 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-[var(--gold)]">
                          <RichText
                            as="span"
                            variant="dark"
                            text={t.label}
                            className="font-medium text-[var(--gold)]"
                          />
                        </span>
                        {t.reason ? (
                          <div className="mt-1 text-xs leading-relaxed text-[var(--parchment)]/80">
                            <span className="text-[var(--gold-dim)]">理由：</span>
                            <RichText
                              as="span"
                              variant="dark"
                              text={t.reason}
                            />
                          </div>
                        ) : (
                          <p className="mt-1 text-xs italic text-[var(--ink-muted)]">
                            （未写理由）
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                          {new Date(t.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
