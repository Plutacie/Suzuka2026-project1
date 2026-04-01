import { put } from "@vercel/blob";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { normalizeRingColor } from "@/lib/ring-color";
import {
  assertSitePassword,
  jsonError,
  SitePasswordError,
} from "@/lib/site-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSitePassword(request);
  } catch (e) {
    if (e instanceof SitePasswordError) {
      return jsonError(e.message, 401);
    }
    throw e;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return jsonError("未配置 BLOB_READ_WRITE_TOKEN，无法上传头像", 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("请求体必须是 multipart/form-data", 400);
  }

  const name = String(formData.get("name") ?? "").trim();
  const backstory = String(formData.get("backstory") ?? "").trim();
  const ringColor = normalizeRingColor(
    String(formData.get("ringColor") ?? ""),
  );
  const avatar = formData.get("avatar");

  if (!name) {
    return jsonError("请填写 OC 名称", 400);
  }

  if (!(avatar instanceof File) || avatar.size === 0) {
    return jsonError("请上传头像图片", 400);
  }

  if (!avatar.type.startsWith("image/")) {
    return jsonError("头像必须是图片文件", 400);
  }

  const ext =
    avatar.type === "image/png"
      ? "png"
      : avatar.type === "image/webp"
        ? "webp"
        : avatar.type === "image/gif"
          ? "gif"
          : "jpg";

  let avatarUrl: string;
  try {
    const blob = await put(`avatars/${crypto.randomUUID()}.${ext}`, avatar, {
      access: "public",
      token,
    });
    avatarUrl = blob.url;
  } catch (err) {
    console.error(err);
    return jsonError("头像上传到存储失败", 502);
  }

  try {
    const db = getDb();
    const [created] = await db
      .insert(characters)
      .values({
        name,
        backstory,
        avatarUrl,
        ringColor,
      })
      .returning({
        id: characters.id,
        name: characters.name,
        avatarUrl: characters.avatarUrl,
        backstory: characters.backstory,
        ringColor: characters.ringColor,
        createdAt: characters.createdAt,
      });

    if (!created) {
      return jsonError("创建失败", 500);
    }

    return Response.json({ character: created });
  } catch (e) {
    console.error(e);
    return jsonError("数据库写入失败", 500);
  }
}
