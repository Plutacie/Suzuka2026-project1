import {
  index,
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

/** 访客为角色添加的萌属性标签及理由 */
export const characterMoeTags = pgTable(
  "character_moe_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("character_moe_tags_character_idx").on(t.characterId)],
);

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

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  nickname: text("nickname").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 有限匿名代号占用：同一时刻每个代号仅一名持有者；过期或主动释放后可再选 */
export const chatNameHolds = pgTable("chat_name_holds", {
  name: text("name").primaryKey(),
  holderKey: text("holder_key").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type RelationshipEdge = typeof relationshipEdges.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatNameHold = typeof chatNameHolds.$inferSelect;
export type CharacterMoeTag = typeof characterMoeTags.$inferSelect;
