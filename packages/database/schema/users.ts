import { pgTable, uuid, varchar, timestamp, boolean, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").default("").notNull(),
    fullName: varchar("full_name", { length: 80 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    profileImageUrl: text("profile_image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("users_email_uq_idx").on(table.email).where(sql`deleted_at IS NULL`),
  ]
);

export const sessionsTable = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
  ]
);

export const accountsTable = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
  ]
);

export const verificationsTable = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export type SelectSession = typeof sessionsTable.$inferSelect;
export type InsertSession = typeof sessionsTable.$inferInsert;

export type SelectAccount = typeof accountsTable.$inferSelect;
export type InsertAccount = typeof accountsTable.$inferInsert;

export type SelectVerification = typeof verificationsTable.$inferSelect;
export type InsertVerification = typeof verificationsTable.$inferInsert;
