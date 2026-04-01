"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { ForceGraphCanvas } from "@/components/ForceGraphCanvas";
import { RingColorPicker } from "@/components/RingColorPicker";
import { getSitePassword, setSitePassword, sitePasswordHeaders } from "@/lib/api-helpers";
import {
  DEFAULT_RING_COLOR,
  normalizeRingColor,
} from "@/lib/ring-color";
import type { GraphLink, GraphNode, GraphPayload } from "@/types/graph";

type Modal = "none" | "add" | "edit";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function revokeSrc(src: string | null) {
  if (src) URL.revokeObjectURL(src);
}

const inputClass =
  "mt-1 w-full rounded-sm border border-[var(--border-subtle)] bg-[#141210] px-2 py-1.5 text-sm text-[var(--parchment)] outline-none focus:border-[var(--gold)]";
const labelClass = "text-xs text-[var(--gold-dim)]";
const btnPrimary =
  "rounded-sm border border-[var(--gold-dim)] bg-gradient-to-b from-[#d4b870] to-[#a68540] px-3 py-1.5 text-xs font-semibold text-[var(--void)] shadow-sm hover:from-[#e8c878] hover:to-[#c9a962]";
const btnGhost =
  "rounded-sm border border-[var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs text-[var(--parchment)] hover:bg-white/5";
const btnDanger =
  "rounded-sm border border-red-900/60 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950/50";

export function OcNetworkPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);

  const [sitePwInput, setSitePwInput] = useState("");

  const [modal, setModal] = useState<Modal>("none");

  const [addName, setAddName] = useState("");
  const [addBackstory, setAddBackstory] = useState("");
  const [addRingColor, setAddRingColor] = useState(DEFAULT_RING_COLOR);
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addCropSrc, setAddCropSrc] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const [editPickId, setEditPickId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editBackstory, setEditBackstory] = useState("");
  const [editRingColor, setEditRingColor] = useState(DEFAULT_RING_COLOR);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editCropSrc, setEditCropSrc] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [edgeTargetId, setEdgeTargetId] = useState("");
  const [edgeView, setEdgeView] = useState("");
  const [edgeHistory, setEdgeHistory] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch("/api/graph");
      const data = (await res.json()) as GraphPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setNodes(
        data.nodes.map((n) => ({
          ...n,
          ringColor: normalizeRingColor(n.ringColor),
        })),
      );
      setLinks(data.links);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setSitePwInput(getSitePassword());
  }, []);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const applySitePassword = () => {
    setSitePassword(sitePwInput.trim());
  };

  const closeAddCrop = () => {
    revokeSrc(addCropSrc);
    setAddCropSrc(null);
  };

  const closeEditCrop = () => {
    revokeSrc(editCropSrc);
    setEditCropSrc(null);
  };

  const openAddModal = () => {
    setAddErr(null);
    setAddRingColor(DEFAULT_RING_COLOR);
    setModal("add");
  };

  const openEditModal = (id: string) => {
    const n = nodeById.get(id);
    setEditPickId(id);
    setEditName(n?.name ?? "");
    setEditBackstory(n?.backstory ?? "");
    setEditRingColor(normalizeRingColor(n?.ringColor));
    setEditFile(null);
    setEdgeTargetId("");
    setEdgeView("");
    setEdgeHistory("");
    setEditErr(null);
    setModal("edit");
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErr(null);
    if (!addFile) {
      setAddErr("请先选择图片并完成裁剪");
      return;
    }
    setAddBusy(true);
    try {
      const fd = new FormData();
      fd.set("name", addName.trim());
      fd.set("backstory", addBackstory);
      fd.set("ringColor", normalizeRingColor(addRingColor));
      fd.set("avatar", addFile);
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: sitePasswordHeaders(),
        body: fd,
      });
      const j = (await res.json()) as {
        error?: string;
        character?: GraphNode;
      };
      if (!res.ok) throw new Error(j.error ?? "创建失败");
      setModal("none");
      setAddName("");
      setAddBackstory("");
      setAddFile(null);
      setAddRingColor(DEFAULT_RING_COLOR);
      await refresh();
    } catch (err) {
      setAddErr(err instanceof Error ? err.message : "创建失败");
    } finally {
      setAddBusy(false);
    }
  };

  useEffect(() => {
    if (!edgeTargetId || !editPickId) return;
    const existing = links.find(
      (l) => l.source === editPickId && l.target === edgeTargetId,
    );
    if (existing) {
      setEdgeView(existing.viewpoint);
      setEdgeHistory(existing.interactionHistory);
    } else {
      setEdgeView("");
      setEdgeHistory("");
    }
  }, [edgeTargetId, editPickId, links]);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErr(null);
    const id = editPickId.trim();
    if (!id) {
      setEditErr("请选择要编辑的角色");
      return;
    }
    setEditBusy(true);
    try {
      const fd = new FormData();
      fd.set("name", editName.trim());
      fd.set("backstory", editBackstory);
      fd.set("ringColor", normalizeRingColor(editRingColor));
      if (editFile) fd.set("avatar", editFile);
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: sitePasswordHeaders(),
        body: fd,
      });
      const j = (await res.json()) as { error?: string; character?: GraphNode };
      if (!res.ok) throw new Error(j.error ?? "保存失败");

      if (edgeTargetId && edgeTargetId !== id) {
        const resE = await fetch("/api/edges", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...sitePasswordHeaders(),
          },
          body: JSON.stringify({
            fromCharacterId: id,
            toCharacterId: edgeTargetId,
            viewpoint: edgeView,
            interactionHistory: edgeHistory,
          }),
        });
        const je = (await resE.json()) as { error?: string };
        if (!resE.ok) throw new Error(je.error ?? "关系保存失败");
      }
      setModal("none");
      await refresh();
      setSelectedNode(null);
      setSelectedLink(null);
    } catch (err) {
      setEditErr(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditBusy(false);
    }
  };

  const deleteSelectedCharacter = async () => {
    if (!selectedNode) return;
    const ok = window.confirm(
      `确定从推演稿中删去「${selectedNode.name}」吗？与其相连的批注也会一并抹去，且无法恢复。`,
    );
    if (!ok) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/characters/${selectedNode.id}`, {
        method: "DELETE",
        headers: sitePasswordHeaders(),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "删除失败");
      setSelectedNode(null);
      setSelectedLink(null);
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleteBusy(false);
    }
  };

  const outgoing = selectedNode
    ? links.filter((l) => l.source === selectedNode.id)
    : [];
  const incoming = selectedNode
    ? links.filter((l) => l.target === selectedNode.id)
    : [];

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col text-[var(--parchment)]">
      <header className="flex flex-shrink-0 flex-col gap-2 border-b border-[var(--border-subtle)] bg-[var(--panel-dark)] px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.35em] text-[var(--gold-dim)]">
            Suzuka 2026 · Field study
          </p>
          <h1 className="font-display text-lg font-semibold tracking-wide text-[var(--parchment)] sm:text-xl">
            铃华2026 · 校外研修
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--gold)]/90">
            关系推演稿
          </p>
          <p className="mt-2 hidden max-w-2xl text-xs leading-relaxed text-[var(--parchment)]/75 sm:block">
            某位演员为研读本次活动背后的「剧本」，将登场者记入名册，并把彼此之间的看法与经历誊成连线——权当排演前的案头工作。点头像可读小传；箭矢示「谁如何看待谁」。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
            站点密钥
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
          <button type="button" onClick={openAddModal} className={btnPrimary}>
            登册角色
          </button>
          <button
            type="button"
            onClick={() => {
              if (nodes.length === 0) {
                window.alert("名册尚空，请先登册一名角色。");
                return;
              }
              openEditModal(nodes[0]!.id);
            }}
            className={btnGhost}
          >
            修订档案
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className={btnGhost}
          >
            重誊一版
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative min-h-[48vh] min-w-0 flex-1 p-2 lg:border-r lg:border-[var(--border-subtle)] lg:p-3">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-[var(--void)]/70 text-sm text-[var(--gold-dim)]">
              展卷中…
            </div>
          )}
          {loadErr && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-sm bg-[var(--void)]/85 p-4 text-center text-sm">
              <p className="text-[var(--parchment)]">{loadErr}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                请配置 DATABASE_URL 并执行 db:push（若刚增加头像框颜色字段，亦需 push）
              </p>
              <button type="button" className={btnPrimary} onClick={() => void refresh()}>
                再试
              </button>
            </div>
          )}
          <ForceGraphCanvas
            nodes={nodes}
            links={links}
            highlightNodeId={selectedNode?.id ?? null}
            highlightLinkId={selectedLink?.id ?? null}
            onNodeClick={(n) => {
              setSelectedNode(n);
              setSelectedLink(null);
            }}
            onLinkClick={(l) => {
              setSelectedLink(l);
              setSelectedNode(null);
            }}
          />
        </section>

        <aside className="w-full shrink-0 overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--panel)]/95 p-4 text-[var(--ink)] lg:w-[min(100%,380px)] lg:border-t-0 lg:border-l lg:border-[var(--border-subtle)]">
          {selectedLink ? (
            <div className="space-y-3 text-sm">
              <h2 className="font-display border-b border-[var(--border-subtle)] pb-2 text-base font-semibold text-[var(--ink)]">
                批注：关系
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                {nodeById.get(selectedLink.source)?.name ?? selectedLink.source}{" "}
                <span className="text-[var(--gold-dim)]">→</span>{" "}
                {nodeById.get(selectedLink.target)?.name ?? selectedLink.target}
              </p>
              <div>
                <div className={labelClass}>看法 / 判词</div>
                <p className="mt-1 whitespace-pre-wrap text-[var(--ink)]">
                  {selectedLink.viewpoint || "（留白）"}
                </p>
              </div>
              <div>
                <div className={labelClass}>台上台下经历</div>
                <p className="mt-1 whitespace-pre-wrap text-[var(--ink)]">
                  {selectedLink.interactionHistory || "（留白）"}
                </p>
              </div>
              <p className="text-xs text-[var(--ink-muted)]">
                在「修订档案」中选定起始角色，可改写这条批注。
              </p>
            </div>
          ) : selectedNode ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedNode.avatarUrl}
                  alt=""
                  className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
                  style={{
                    boxShadow: `0 0 0 3px ${normalizeRingColor(selectedNode.ringColor)}, 0 0 12px rgba(201,169,98,0.25)`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
                    {selectedNode.name}
                  </h2>
                  <p className="text-xs text-[var(--ink-muted)]">
                    录入于{" "}
                    {new Date(selectedNode.createdAt).toLocaleString("zh-CN")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => openEditModal(selectedNode.id)}
                    >
                      修订此条
                    </button>
                    <button
                      type="button"
                      disabled={deleteBusy}
                      className={cn(btnDanger, deleteBusy && "opacity-50")}
                      onClick={() => void deleteSelectedCharacter()}
                    >
                      {deleteBusy ? "删去中…" : "从册上删去"}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className={labelClass}>人物小传 / 案卷摘要</div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--ink)]">
                  {selectedNode.backstory || "（尚未撰写）"}
                </p>
              </div>
              <div>
                <div className="text-xs font-medium text-[#6b5a3a]">
                  此人如何看待他人
                </div>
                <ul className="mt-2 space-y-2">
                  {outgoing.length === 0 && (
                    <li className="text-sm text-[var(--ink-muted)]">暂无 outgoing 批注</li>
                  )}
                  {outgoing.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-sm border border-[var(--border-subtle)] bg-[#f5f0e6]/80 p-2"
                    >
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-[#5c4a28] hover:underline"
                        onClick={() => setSelectedLink(l)}
                      >
                        → {nodeById.get(l.target)?.name ?? l.target}
                      </button>
                      <p className="mt-1 line-clamp-3 text-xs text-[var(--ink-muted)]">
                        {l.viewpoint || "（未写看法）"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-[#4a5a6e]">
                  他人如何看待此人
                </div>
                <ul className="mt-2 space-y-2">
                  {incoming.length === 0 && (
                    <li className="text-sm text-[var(--ink-muted)]">暂无 incoming 批注</li>
                  )}
                  {incoming.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-sm border border-[var(--border-subtle)] bg-[#e8e4dc]/90 p-2"
                    >
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-[#3d4f63] hover:underline"
                        onClick={() => setSelectedLink(l)}
                      >
                        ← {nodeById.get(l.source)?.name ?? l.source}
                      </button>
                      <p className="mt-1 line-clamp-3 text-xs text-[var(--ink-muted)]">
                        {l.viewpoint || "（未写看法）"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-[var(--ink-muted)]">
              <p className="font-display text-base font-semibold text-[var(--ink)]">
                案头说明
              </p>
              <p>于左侧卷轴上点头像，可读该角色小传与往来批注。</p>
              <p>点金线，可读两人之间的看法与经历摘要。</p>
            </div>
          )}
        </aside>
      </div>

      {addCropSrc && (
        <AvatarCropDialog
          imageSrc={addCropSrc}
          title="裁剪肖像（登册）"
          onCancel={closeAddCrop}
          onDone={(file) => {
            closeAddCrop();
            setAddFile(file);
          }}
        />
      )}

      {editCropSrc && (
        <AvatarCropDialog
          imageSrc={editCropSrc}
          title="裁剪新肖像"
          onCancel={closeEditCrop}
          onDone={(file) => {
            closeEditCrop();
            setEditFile(file);
          }}
        />
      )}

      {modal === "add" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitAdd}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--panel)] p-5 text-[var(--ink)] shadow-2xl"
          >
            <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
              登册新角色
            </h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              择像、裁方、选头像框色，再撰小传。众人皆可改，如同传阅的稿本。
            </p>
            <label className="mt-4 block">
              <span className={labelClass}>称呼</span>
              <input
                required
                className={inputClass}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>人物小传</span>
              <textarea
                className={cn(inputClass, "min-h-[100px]")}
                value={addBackstory}
                onChange={(e) => setAddBackstory(e.target.value)}
              />
            </label>
            <div className="mt-4 rounded-sm border border-[var(--border-subtle)] bg-[#f0ebe3]/50 p-3">
              <RingColorPicker
                value={addRingColor}
                onChange={setAddRingColor}
                colorInputId="add-ring-color"
              />
            </div>
            <div className="mt-3 block">
              <span className={labelClass}>肖像（须裁剪）</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-[var(--ink-muted)] file:mr-2 file:rounded-sm file:border file:border-[var(--border-subtle)] file:bg-[#141210] file:px-2 file:py-1 file:text-[var(--parchment)]"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f || !f.type.startsWith("image/")) return;
                  revokeSrc(addCropSrc);
                  setAddCropSrc(URL.createObjectURL(f));
                }}
              />
              {addFile && (
                <p className="mt-1 text-xs text-[#2d5a3d]">
                  肖像已备：{addFile.name}（{Math.round(addFile.size / 1024)} KB）
                </p>
              )}
            </div>
            {addErr && (
              <p className="mt-2 text-sm text-red-800">{addErr}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setModal("none");
                  closeAddCrop();
                  setAddFile(null);
                }}
              >
                作罢
              </button>
              <button
                type="submit"
                disabled={addBusy}
                className={cn(btnPrimary, addBusy && "opacity-60")}
              >
                {addBusy ? "写入中…" : "写入名册"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === "edit" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitEdit}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-sm border border-[var(--border-subtle)] bg-[var(--panel)] p-5 text-[var(--ink)] shadow-2xl"
          >
            <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
              修订档案与批注
            </h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              可改任意角色，亦可自某人指向另一人写下看法与经历。
            </p>

            <label className="mt-3 block">
              <span className={labelClass}>要修订的角色</span>
              <select
                className={inputClass}
                value={editPickId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEditPickId(id);
                  const n = nodeById.get(id);
                  setEditName(n?.name ?? "");
                  setEditBackstory(n?.backstory ?? "");
                  setEditRingColor(normalizeRingColor(n?.ringColor));
                }}
              >
                <option value="">请选择</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>

            <hr className="my-4 border-[var(--border-subtle)]" />
            <div className="text-[10px] uppercase tracking-wider text-[var(--gold-dim)]">
              档案
            </div>
            <label className="mt-2 block">
              <span className={labelClass}>称呼</span>
              <input
                className={inputClass}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>人物小传</span>
              <textarea
                className={cn(inputClass, "min-h-[80px]")}
                value={editBackstory}
                onChange={(e) => setEditBackstory(e.target.value)}
              />
            </label>
            <div className="mt-4 rounded-sm border border-[var(--border-subtle)] bg-[#f0ebe3]/50 p-3">
              <RingColorPicker
                value={editRingColor}
                onChange={setEditRingColor}
                colorInputId="edit-ring-color"
              />
            </div>
            <div className="mt-3 block">
              <span className={labelClass}>更换肖像（可选）</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-[var(--ink-muted)] file:mr-2 file:rounded-sm file:border file:border-[var(--border-subtle)] file:bg-[#141210] file:px-2 file:py-1 file:text-[var(--parchment)]"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f || !f.type.startsWith("image/")) return;
                  revokeSrc(editCropSrc);
                  setEditCropSrc(URL.createObjectURL(f));
                }}
              />
              {editFile && (
                <p className="mt-1 text-xs text-[#2d5a3d]">
                  新肖像已备：{editFile.name}
                </p>
              )}
            </div>

            <hr className="my-4 border-[var(--border-subtle)]" />
            <div className="text-[10px] uppercase tracking-wider text-[var(--gold-dim)]">
              关系批注（自当前角色指向…）
            </div>
            <label className="mt-2 block">
              <span className={labelClass}>另一角色</span>
              <select
                className={inputClass}
                value={edgeTargetId}
                onChange={(e) => setEdgeTargetId(e.target.value)}
              >
                <option value="">不修改关系（仅保存档案）</option>
                {nodes
                  .filter((n) => n.id !== editPickId)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>看法 / 判词</span>
              <textarea
                className={cn(inputClass, "min-h-[60px]")}
                value={edgeView}
                onChange={(e) => setEdgeView(e.target.value)}
                disabled={!edgeTargetId}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>台上台下经历</span>
              <textarea
                className={cn(inputClass, "min-h-[60px]")}
                value={edgeHistory}
                onChange={(e) => setEdgeHistory(e.target.value)}
                disabled={!edgeTargetId}
              />
            </label>

            {editErr && (
              <p className="mt-2 text-sm text-red-800">{editErr}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setModal("none");
                  closeEditCrop();
                  setEditFile(null);
                }}
              >
                合上
              </button>
              <button
                type="submit"
                disabled={editBusy || !editPickId}
                className={cn(
                  btnPrimary,
                  (editBusy || !editPickId) && "opacity-60",
                )}
              >
                {editBusy ? "写入中…" : "存稿"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
