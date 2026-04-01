import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { normalizeRingColor } from "@/lib/ring-color";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";

export async function PATCH(
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("请求体必须是 multipart/form-data", 400);
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);

  if (!existing) {
    return jsonError("OC 不存在", 404);
  }

  const nameRaw = formData.get("name");
  const backstoryRaw = formData.get("backstory");
  const ringColorRaw = formData.get("ringColor");
  const avatar = formData.get("avatar");

  const name =
    nameRaw == null ? existing.name : String(nameRaw).trim() || existing.name;
  const backstory =
    backstoryRaw == null
      ? existing.backstory
      : String(backstoryRaw).trim();
  const ringColor =
    ringColorRaw == null
      ? normalizeRingColor(existing.ringColor)
      : normalizeRingColor(String(ringColorRaw));

  let avatarUrl = existing.avatarUrl;

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return jsonError("头像必须是图片文件", 400);
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return jsonError("未配置 BLOB_READ_WRITE_TOKEN", 503);
    }
    const ext =
      avatar.type === "image/png"
        ? "png"
        : avatar.type === "image/webp"
          ? "webp"
          : avatar.type === "image/gif"
            ? "gif"
            : "jpg";
    try {
      const blob = await put(`avatars/${crypto.randomUUID()}.${ext}`, avatar, {
        access: "public",
        token,
      });
      avatarUrl = blob.url;
    } catch (err) {
      console.error(err);
      return jsonError("头像上传失败", 502);
    }
  }

  const [updated] = await db
    .update(characters)
    .set({ name, backstory, avatarUrl, ringColor })
    .where(eq(characters.id, id))
    .returning({
      id: characters.id,
      name: characters.name,
      avatarUrl: characters.avatarUrl,
      backstory: characters.backstory,
      ringColor: characters.ringColor,
      createdAt: characters.createdAt,
    });

  if (!updated) {
    return jsonError("更新失败", 500);
  }

  return Response.json({ character: updated });
}

export async function DELETE(
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
  const db = getDb();

  const deleted = await db
    .delete(characters)
    .where(eq(characters.id, id))
    .returning({ id: characters.id });

  if (deleted.length === 0) {
    return jsonError("OC 不存在", 404);
  }

  return Response.json({ ok: true });
}
