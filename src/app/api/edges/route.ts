import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { characters, relationshipEdges } from "@/db/schema";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";

export async function PUT(request: Request) {
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
    return jsonError("请求体必须是 JSON", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("无效的 JSON", 400);
  }

  const b = body as Record<string, unknown>;
  const fromCharacterId = String(b.fromCharacterId ?? "");
  const toCharacterId = String(b.toCharacterId ?? "");
  const viewpoint = String(b.viewpoint ?? "").trim();
  const interactionHistory = String(b.interactionHistory ?? "").trim();

  if (!fromCharacterId || !toCharacterId) {
    return jsonError("必须提供 fromCharacterId 与 toCharacterId", 400);
  }

  if (fromCharacterId === toCharacterId) {
    return jsonError("不能创建指向自己的关系边", 400);
  }

  const db = getDb();

  const [fromRow] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.id, fromCharacterId))
    .limit(1);
  if (!fromRow) {
    return jsonError("起始 OC 不存在", 404);
  }

  const [toRow] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.id, toCharacterId))
    .limit(1);
  if (!toRow) {
    return jsonError("目标 OC 不存在", 404);
  }

  const now = new Date();

  try {
    const [row] = await db
      .insert(relationshipEdges)
      .values({
        fromCharacterId,
        toCharacterId,
        viewpoint,
        interactionHistory,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          relationshipEdges.fromCharacterId,
          relationshipEdges.toCharacterId,
        ],
        set: {
          viewpoint,
          interactionHistory,
          updatedAt: now,
        },
      })
      .returning();

    if (!row) {
      return jsonError("保存关系失败", 500);
    }

    return Response.json({
      edge: {
        id: row.id,
        source: row.fromCharacterId,
        target: row.toCharacterId,
        viewpoint: row.viewpoint,
        interactionHistory: row.interactionHistory,
        updatedAt: row.updatedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return jsonError("数据库写入失败", 500);
  }
}
