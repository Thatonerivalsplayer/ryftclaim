import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull().unique(), // New unique claim ID for users to use
  invoiceId: text("invoice_id").notNull().unique(),
  email: text("email").notNull(),
  robloxUsername: text("roblox_username"), // Optional - only set when user joins bot
  verified: boolean("verified").notNull().default(false),
  claimed: boolean("claimed").notNull().default(false),
  discordChannelId: text("discord_channel_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const claimItems = pgTable("claim_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").notNull().references(() => claims.id),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  imageUrl: text("image_url"),
  delivered: boolean("delivered").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  verified: true,
  createdAt: true,
});

export const claimVerificationSchema = z.object({
  invoiceId: z.string().min(1, "Order number is required").max(100, "Order number too long"),
  email: z.string().email("Invalid email format"),
  robloxUsername: z.string().min(3, "Roblox username must be at least 3 characters").max(20, "Roblox username cannot exceed 20 characters"),
});

export const verifyClaimSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required").max(100, "Invoice ID too long"),
  email: z.string().email("Invalid email format"),
});

export const botJoinSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  robloxUsername: z.string().min(1, "Roblox username is required").max(50, "Username too long"),
  discordUsername: z.string().min(1, "Discord username is required").max(50, "Username too long"),
});

export const createTicketSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  email: z.string().email("Invalid email format"),
  robloxUsername: z.string().min(1, "Roblox username is required").max(50, "Username too long"),
  discordUsername: z.string().min(1, "Discord username is required").max(50, "Username too long"),
  discordUserId: z.string().min(1, "Discord user ID is required"),
  items: z.array(z.any()).min(1, "At least one item is required"),
});

export const insertClaimItemSchema = createInsertSchema(claimItems).omit({
  id: true,
  delivered: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type ClaimVerification = z.infer<typeof claimVerificationSchema>;
export type VerifyClaim = z.infer<typeof verifyClaimSchema>;
export type BotJoin = z.infer<typeof botJoinSchema>;
export type CreateTicket = z.infer<typeof createTicketSchema>;
export type InsertClaimItem = z.infer<typeof insertClaimItemSchema>;
export type ClaimItem = typeof claimItems.$inferSelect;

export type ClaimWithItems = Claim & {
  items: ClaimItem[];
};
