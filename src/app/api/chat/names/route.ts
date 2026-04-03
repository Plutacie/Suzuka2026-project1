import { and, eq, lt, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { chatNameHolds } from "@/db/schema";
import {
  CHAT_ANONYMOUS_NAMES,
  CHAT_HOLD_LEASE_MS,
  isValidChatPoolName,
} from "@/lib/chat-names";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NameEntry = { name: string; state: "free" | "taken" | "mine" };

async function cleanupExpired(db: ReturnType<typeof getDb>) {
  await db.delete(chatNameHolds).where(lt(chatNameHolds.expiresAt, new Date()));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const holderKey = url.searchParams.get("holderKey")?.trim() ?? "";

    const db = getDb();
    await cleanupExpired(db);

    const holds = await db.select().from(chatNameHolds);
    const byName = new Map(holds.map((h) => [h.name, h]));

    const entries: NameEntry[] = CHAT_ANONYMOUS_NAMES.map((name) => {
      const row = byName.get(name);
      if (!row) return { name, state: "free" as const };
      if (holderKey && row.holderKey === holderKey) {
        return { name, state: "mine" as const };
      }
      return { name, state: "taken" as const };
    });

    return Response.json({ entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载代号失败";
    console.error(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

type PostBody = {
  action?: string;
  holderKey?: string;
  name?: string;
};

export async function POST(request: Request) {
  try {
    assertSitePassword(request);
  } catch (e) {
    if (e instanceof SitePasswordError) {
      return jsonError(e.message, 401);
    }
    throw e;
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError("请求体须为 JSON", 400);
  }

  const holderKey = String(body.holderKey ?? "").trim();
  if (!holderKey || holderKey.length > 80) {
    return jsonError("缺少或无效的 holderKey", 400);
  }

  const action = String(body.action ?? "").trim();
  const db = getDb();
  await cleanupExpired(db);
  const until = new Date(Date.now() + CHAT_HOLD_LEASE_MS);

  if (action === "release") {
    await db.delete(chatNameHolds).where(eq(chatNameHolds.holderKey, holderKey));
    return Response.json({ ok: true });
  }

  if (action === "heartbeat") {
    const [row] = await db
      .select()
      .from(chatNameHolds)
      .where(eq(chatNameHolds.holderKey, holderKey))
      .limit(1);
    if (!row) {
      return jsonError("当前没有占用的代号", 404);
    }
    await db
      .update(chatNameHolds)
      .set({ expiresAt: until })
      .where(eq(chatNameHolds.holderKey, holderKey));
    return Response.json({ ok: true, name: row.name });
  }

  if (action === "claim") {
    const name = String(body.name ?? "").trim();
    if (!isValidChatPoolName(name)) {
      return jsonError("无效的代号", 400);
    }

    await db
      .delete(chatNameHolds)
      .where(and(eq(chatNameHolds.holderKey, holderKey), ne(chatNameHolds.name, name)));

    const [existing] = await db
      .select()
      .from(chatNameHolds)
      .where(eq(chatNameHolds.name, name))
      .limit(1);

    if (!existing) {
      await db.insert(chatNameHolds).values({
        name,
        holderKey,
        expiresAt: until,
      });
      return Response.json({ ok: true, name });
    }

    if (existing.holderKey === holderKey) {
      await db
        .update(chatNameHolds)
        .set({ expiresAt: until })
        .where(eq(chatNameHolds.name, name));
      return Response.json({ ok: true, name });
    }

    return jsonError("该代号已被他人占用", 409);
  }

  return jsonError("未知的 action", 400);
}
