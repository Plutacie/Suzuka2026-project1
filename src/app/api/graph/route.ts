import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  characterMoeTags,
  characters,
  relationshipEdges,
} from "@/db/schema";
import { normalizeRingColor } from "@/lib/ring-color";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const [allCharacters, allEdges, allMoeTags] = await Promise.all([
      db.select().from(characters),
      db.select().from(relationshipEdges),
      db
        .select()
        .from(characterMoeTags)
        .orderBy(asc(characterMoeTags.createdAt)),
    ]);

    const tagsByCharacter = new Map<
      string,
      {
        id: string;
        label: string;
        reason: string;
        createdAt: string;
      }[]
    >();
    for (const t of allMoeTags) {
      const list = tagsByCharacter.get(t.characterId) ?? [];
      list.push({
        id: t.id,
        label: t.label,
        reason: t.reason,
        createdAt: t.createdAt.toISOString(),
      });
      tagsByCharacter.set(t.characterId, list);
    }

    const nodes = allCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      backstory: c.backstory,
      ringColor: normalizeRingColor(c.ringColor),
      createdAt: c.createdAt,
      moeTags: tagsByCharacter.get(c.id) ?? [],
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
