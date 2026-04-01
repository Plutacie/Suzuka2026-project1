import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  backstory: text("backstory").notNull().default(""),
  /** 头像外圈颜色，#RRGGBB */
  ringColor: text("ring_color").notNull().default("#c9a962"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const relationshipEdges = pgTable(
  "relationship_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromCharacterId: uuid("from_character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    toCharacterId: uuid("to_character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    viewpoint: text("viewpoint").notNull().default(""),
    interactionHistory: text("interaction_history").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("relationship_edges_from_to_unique").on(
      t.fromCharacterId,
      t.toCharacterId,
    ),
  ],
);

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type RelationshipEdge = typeof relationshipEdges.$inferSelect;
