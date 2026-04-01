import { getDb } from "@/db";
import { characters, relationshipEdges } from "@/db/schema";
import { normalizeRingColor } from "@/lib/ring-color";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const [allCharacters, allEdges] = await Promise.all([
      db.select().from(characters),
      db.select().from(relationshipEdges),
    ]);

    const nodes = allCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      backstory: c.backstory,
      ringColor: normalizeRingColor(c.ringColor),
      createdAt: c.createdAt,
    }));

    const links = allEdges.map((e) => ({
      id: e.id,
      source: e.fromCharacterId,
      target: e.toCharacterId,
      viewpoint: e.viewpoint,
      interactionHistory: e.interactionHistory,
      updatedAt: e.updatedAt,
    }));

    return Response.json({ nodes, links });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载关系图失败";
    console.error(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
