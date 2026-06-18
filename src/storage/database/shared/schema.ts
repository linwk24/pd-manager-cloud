import { sql } from "drizzle-orm"
import { pgTable, serial, timestamp, varchar, text, uuid, index } from "drizzle-orm/pg-core"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 个人密码条目表
export const vaultEntries = pgTable(
	"vault_entries",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
		title: varchar("title", { length: 128 }).notNull(),
		username: varchar("username", { length: 256 }),
		password: text("password").notNull(),
		url: text("url"),
		notes: text("notes"),
		category: varchar("category", { length: 64 }).default("默认"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("vault_entries_user_id_idx").on(table.user_id),
		index("vault_entries_category_idx").on(table.category),
		index("vault_entries_created_at_idx").on(table.created_at),
	]
);
