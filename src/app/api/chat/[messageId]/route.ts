import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ messageId: string }> },
) {
  try {
    assertSitePassword(request);
  } catch (e) {
    if (e instanceof SitePasswordError) {
      return jsonError(e.message, 401);
    }
    throw e;
  }

  const { messageId } = await ctx.params;
  if (!messageId?.trim()) {
    return jsonError("无效的消息 id", 400);
  }

  try {
    const db = getDb();
    const deleted = await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .returning({ id: chatMessages.id });

    if (deleted.length === 0) {
      return jsonError("消息不存在或已删除", 404);
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("删除失败", 500);
  }
}
