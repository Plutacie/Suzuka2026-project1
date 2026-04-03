import { asc, desc, eq, getTableColumns, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { chatMessages, chatNameHolds } from "@/db/schema";
import {
  CHAT_MAX_BODY_LEN,
  CHAT_HOLD_LEASE_MS,
} from "@/lib/chat-names";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const afterId = url.searchParams.get("after");

    const db = getDb();

    if (afterId) {
      const [anchor] = await db
        .select({ createdAt: chatMessages.createdAt })
        .from(chatMessages)
        .where(eq(chatMessages.id, afterId))
        .limit(1);

      if (!anchor) {
        return Response.json({ messages: [] as unknown[] });
      }

      const rows = await db
        .select(getTableColumns(chatMessages))
        .from(chatMessages)
        .where(gt(chatMessages.createdAt, anchor.createdAt))
        .orderBy(asc(chatMessages.createdAt))
        .limit(200);

      return Response.json({ messages: rows });
    }

    const rows = await db
      .select(getTableColumns(chatMessages))
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(120);

    rows.reverse();

    return Response.json({ messages: rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载消息失败";
    console.error(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSitePassword(request);
  } catch (e) {
    if (e instanceof SitePasswordError) {
      return jsonError(e.message, 401);
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体须为 JSON", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("无效的请求体", 400);
  }

  const holderKey = String((body as { holderKey?: unknown }).holderKey ?? "").trim();
  const text = String((body as { body?: unknown }).body ?? "").trim();

  if (!holderKey || holderKey.length > 80) {
    return jsonError("缺少或无效的 holderKey", 400);
  }

  if (!text) {
    return jsonError("消息不能为空", 400);
  }

  if (text.length > CHAT_MAX_BODY_LEN) {
    return jsonError(`消息过长（最多 ${CHAT_MAX_BODY_LEN} 字）`, 400);
  }

  const now = new Date();
  const db = getDb();

  await db.delete(chatNameHolds).where(lt(chatNameHolds.expiresAt, now));

  const [hold] = await db
    .select()
    .from(chatNameHolds)
    .where(eq(chatNameHolds.holderKey, holderKey))
    .limit(1);

  if (!hold || hold.expiresAt <= now) {
    return jsonError("请先重新选择代号（可能已过期或被释放）", 403);
  }

  const [created] = await db
    .insert(chatMessages)
    .values({
      nickname: hold.name,
      body: text,
    })
    .returning();

  if (!created) {
    return jsonError("发送失败", 500);
  }

  const until = new Date(Date.now() + CHAT_HOLD_LEASE_MS);
  await db
    .update(chatNameHolds)
    .set({ expiresAt: until })
    .where(eq(chatNameHolds.holderKey, holderKey));

  return Response.json({ message: created });
}
