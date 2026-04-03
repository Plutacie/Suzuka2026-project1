"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { sitePasswordHeaders } from "@/lib/api-helpers";
import { CHAT_MAX_BODY_LEN } from "@/lib/chat-names";

const HOLDER_STORAGE = "oc_chat_holder_key";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const btnPrimary =
  "rounded-sm border border-[var(--gold-dim)] bg-gradient-to-b from-[#d4b870] to-[#a68540] px-3 py-1.5 text-xs font-semibold text-[var(--void)] shadow-sm hover:from-[#e8c878] hover:to-[#c9a962]";
const btnGhost =
  "rounded-sm border border-[var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs text-[var(--parchment)] hover:bg-white/5";
const btnDeleteMsg =
  "shrink-0 rounded-sm border border-red-900/60 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-950/50";
const inputClass =
  "mt-1 w-full rounded-sm border border-[var(--border-subtle)] bg-[#141210] px-2 py-1.5 text-sm text-[var(--parchment)] outline-none focus:border-[var(--gold)]";

type NameEntry = { name: string; state: "free" | "taken" | "mine" };

type ChatRow = {
  id: string;
  nickname: string;
  body: string;
  createdAt: string;
};

function getOrCreateHolderKey(): string {
  if (typeof window === "undefined") return "";
  let k = sessionStorage.getItem(HOLDER_STORAGE);
  if (!k) {
    k = crypto.randomUUID();
    sessionStorage.setItem(HOLDER_STORAGE, k);
  }
  return k;
}

async function postNames(
  body: Record<string, string>,
): Promise<{ ok?: boolean; error?: string; name?: string }> {
  const res = await fetch("/api/chat/names", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sitePasswordHeaders(),
    },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as { ok?: boolean; error?: string; name?: string };
  if (!res.ok) {
    return { error: j.error ?? "请求失败" };
  }
  return j;
}

export default function ChatPage() {
  const router = useRouter();
  const [holderKey, setHolderKey] = useState("");
  const [entries, setEntries] = useState<NameEntry[]>([]);
  const [myName, setMyName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const pollSlowRef = useRef(false);

  const releaseHold = useCallback(async () => {
    const hk =
      holderKey ||
      (typeof window !== "undefined" ? sessionStorage.getItem(HOLDER_STORAGE) : null);
    if (!hk) return;
    try {
      await fetch("/api/chat/names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sitePasswordHeaders(),
        },
        body: JSON.stringify({ action: "release", holderKey: hk }),
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, [holderKey]);

  useEffect(() => {
    setHolderKey(getOrCreateHolderKey());
  }, []);

  const refreshNames = useCallback(async () => {
    const hk = holderKey || getOrCreateHolderKey();
    if (!hk) return;
    try {
      const res = await fetch(
        `/api/chat/names?holderKey=${encodeURIComponent(hk)}`,
      );
      const j = (await res.json()) as {
        entries?: NameEntry[];
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "加载代号失败");
      setEntries(j.entries ?? []);
      const mine = j.entries?.find((e) => e.state === "mine");
      setMyName(mine ? mine.name : null);
    } catch {
      /* 下一轮轮询再试 */
    }
  }, [holderKey]);

  useEffect(() => {
    if (!holderKey) return;
    void refreshNames();
    const id = window.setInterval(() => void refreshNames(), 2500);
    return () => window.clearInterval(id);
  }, [holderKey, refreshNames]);

  useEffect(() => {
    const onVis = () => {
      pollSlowRef.current = document.visibilityState !== "visible";
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const fetchMessages = useCallback(async () => {
    const after = lastIdRef.current;
    const url = after
      ? `/api/chat?after=${encodeURIComponent(after)}`
      : "/api/chat";
    const res = await fetch(url);
    const j = (await res.json()) as { messages?: ChatRow[]; error?: string };
    if (!res.ok) throw new Error(j.error ?? "加载消息失败");
    const batch = j.messages ?? [];
    if (!after && batch.length > 0) {
      setMessages(batch);
      lastIdRef.current = batch[batch.length - 1]!.id;
      return;
    }
    if (batch.length > 0) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of batch) {
          if (!ids.has(m.id)) merged.push(m);
        }
        return merged;
      });
      lastIdRef.current = batch[batch.length - 1]!.id;
    }
  }, []);

  useEffect(() => {
    if (!myName) return;
    lastIdRef.current = null;
    setMessages([]);
    let cancelled = false;
    let tid: number | undefined;
    const tick = async () => {
      if (cancelled) return;
      await fetchMessages().catch(() => {});
      if (cancelled) return;
      const ms = pollSlowRef.current ? 4500 : 2200;
      tid = window.setTimeout(() => void tick(), ms);
    };
    void tick();
    return () => {
      cancelled = true;
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, [myName, fetchMessages]);

  useEffect(() => {
    if (!myName || !holderKey) return;
    const hb = () => {
      void postNames({ action: "heartbeat", holderKey });
    };
    hb();
    const id = window.setInterval(hb, 45_000);
    return () => window.clearInterval(id);
  }, [myName, holderKey]);

  const claim = async (name: string) => {
    setClaimErr(null);
    setBusyName(name);
    try {
      const r = await postNames({
        action: "claim",
        holderKey,
        name,
      });
      if (r.error) {
        setClaimErr(r.error);
        return;
      }
      setMyName(r.name ?? name);
      await refreshNames();
    } finally {
      setBusyName(null);
    }
  };

  const leaveRoom = async () => {
    await releaseHold();
    setMyName(null);
    setMessages([]);
    lastIdRef.current = null;
    setDraft("");
    setSendErr(null);
    await refreshNames();
  };

  const goHome = async () => {
    await releaseHold();
    router.push("/");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !holderKey) return;
    setSendErr(null);
    setSendBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sitePasswordHeaders(),
        },
        body: JSON.stringify({ holderKey, body: text }),
      });
      const j = (await res.json()) as { error?: string; message?: ChatRow };
      if (!res.ok) {
        setSendErr(j.error ?? "发送失败");
        return;
      }
      setDraft("");
      if (j.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === j.message!.id)) return prev;
          return [...prev, j.message!];
        });
        lastIdRef.current = j.message.id;
      }
    } finally {
      setSendBusy(false);
    }
  };

  const deleteMessage = async (id: string) => {
    setDeleteErr(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: sitePasswordHeaders(),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteErr(j.error ?? "删除失败");
        return;
      }
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== id);
        const last = next[next.length - 1];
        lastIdRef.current = last ? last.id : null;
        return next;
      });
    } finally {
      setDeletingId(null);
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
            匿名对谈
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--gold)]/90">
            有限代号 · 任何人可删除任意消息 · 点「离开」或返回关系图会释放代号
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={() => void goHome()}>
            返回关系图
          </button>
          {myName && (
            <button type="button" className={btnPrimary} onClick={() => void leaveRoom()}>
              离开并释放代号
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {!myName ? (
          <section className="rounded-sm border border-[var(--border-subtle)] bg-[var(--panel-dark)] p-4">
            <h2 className="font-display text-base font-semibold text-[var(--parchment)]">
              选一个代号
            </h2>
            <p className="mt-1 text-xs text-[var(--parchment)]/70">
              每个代号同时只能有一人使用。若本站启用了站点密码，认领、发消息、删消息前请先在首页填写密码。
            </p>
            {claimErr && (
              <p className="mt-2 text-sm text-red-300">{claimErr}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {entries.map((e) => (
                <button
                  key={e.name}
                  type="button"
                  disabled={
                    e.state === "taken" || (busyName !== null && busyName !== e.name)
                  }
                  onClick={() => void claim(e.name)}
                  className={cn(
                    "rounded-sm border px-2 py-2 text-xs transition-colors",
                    e.state === "free" &&
                      "border-[var(--border-subtle)] bg-[#141210] text-[var(--parchment)] hover:border-[var(--gold)]",
                    e.state === "taken" &&
                      "cursor-not-allowed border-white/10 bg-black/20 text-[var(--ink-muted)]",
                    e.state === "mine" &&
                      "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-bright)]",
                    busyName === e.name && "opacity-70",
                  )}
                >
                  {e.name}
                  {e.state === "taken" && "（占用中）"}
                  {e.state === "mine" && "（我的）"}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col rounded-sm border border-[var(--border-subtle)] bg-[var(--panel-dark)]">
            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--gold-dim)]">
              当前代号：<span className="text-[var(--parchment)]">{myName}</span>
            </div>
            <div className="max-h-[min(52vh,420px)] min-h-[200px] flex-1 space-y-2 overflow-y-auto p-3">
              {deleteErr && (
                <p className="text-center text-sm text-red-300">{deleteErr}</p>
              )}
              {messages.length === 0 && (
                <p className="text-center text-sm text-[var(--ink-muted)]">
                  还没有消息，来说一句吧。
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-sm border border-[var(--border-subtle)]/50 bg-black/25 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-[11px] text-[var(--gold-dim)]">
                      <span className="font-medium text-[var(--gold)]">{m.nickname}</span>
                      <time dateTime={m.createdAt}>
                        {new Date(m.createdAt).toLocaleString("zh-CN")}
                      </time>
                    </div>
                    <button
                      type="button"
                      className={cn(btnDeleteMsg, deletingId === m.id && "opacity-50")}
                      disabled={deletingId !== null}
                      onClick={() => void deleteMessage(m.id)}
                    >
                      {deletingId === m.id ? "…" : "删除"}
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--parchment)]">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="border-t border-[var(--border-subtle)] p-3">
              {sendErr && (
                <p className="mb-2 text-sm text-red-300">{sendErr}</p>
              )}
              <label className="block text-xs text-[var(--gold-dim)]">
                消息（最多 {CHAT_MAX_BODY_LEN} 字）
                <textarea
                  className={cn(inputClass, "mt-1 min-h-[80px] resize-y")}
                  value={draft}
                  maxLength={CHAT_MAX_BODY_LEN}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="输入后发送…"
                />
              </label>
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={sendBusy || !draft.trim()}
                  className={cn(btnPrimary, (sendBusy || !draft.trim()) && "opacity-50")}
                >
                  {sendBusy ? "发送中…" : "发送"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
