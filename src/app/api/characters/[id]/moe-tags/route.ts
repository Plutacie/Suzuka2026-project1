import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { characterMoeTags, characters } from "@/db/schema";
import {
  MOE_TAG_MAX_LABEL,
  MOE_TAG_MAX_REASON,
} from "@/lib/moe-tags";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertSitePassword(request);
  } catch (e) {
    if (e instanceof SitePasswordError) {
      return jsonError(e.message, 401);
    }
    throw e;
  }

  const { id } = await ctx.params;

  let body: { label?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { label?: unknown; reason?: unknown };
  } catch {
    return jsonError("请求体须为 JSON", 400);
  }

  const label = String(body.label ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (!label) {
    return jsonError("请填写标签内容", 400);
  }
  if (label.length > MOE_TAG_MAX_LABEL) {
    return jsonError(`标签过长（最多 ${MOE_TAG_MAX_LABEL} 字）`, 400);
  }
  if (reason.length > MOE_TAG_MAX_REASON) {
    return jsonError(`理由过长（最多 ${MOE_TAG_MAX_REASON} 字）`, 400);
  }

  const db = getDb();
  const [ch] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);

  if (!ch) {
    return jsonError("角色不存在", 404);
  }

  const [row] = await db
    .insert(characterMoeTags)
    .values({
      characterId: id,
      label,
      reason,
    })
    .returning();

  if (!row) {
    return jsonError("添加失败", 500);
  }

  return Response.json({
    tag: {
      id: row.id,
      label: row.label,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
