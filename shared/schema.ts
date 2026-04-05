import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  mobile: text("mobile"),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  mobileVerified: integer("mobile_verified", { mode: "boolean" }).default(false),
  mobileVerifiedVia: text("mobile_verified_via"),
  referralCode: text("referral_code"),
  whatsappOptIn: integer("whatsapp_opt_in", { mode: "boolean" }).default(false),
  kycStatus: text("kyc_status").default("not_started"),
  bio: text("bio"),
  skills: text("skills"),
  timezone: text("timezone"),
  language: text("language").default("en"),
  photoUrl: text("photo_url"),
  status: text("status").default("active"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const legalAcceptances = sqliteTable("legal_acceptances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  documentType: text("document_type").notNull(),
  documentVersion: text("document_version").notNull(),
  documentUrl: text("document_url"),
  acceptedAt: text("accepted_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budgetMin: real("budget_min").notNull(),
  budgetMax: real("budget_max").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").default("open"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const taskApplications = sqliteTable("task_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").default("pending"),
  appliedAt: text("applied_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").default("pending"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const referrals = sqliteTable("referrals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referredEmail: text("referred_email"),
  status: text("status").default("pending"),
  earnedAmount: real("earned_amount").default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().optional(),
  referralCode: z.string().optional(),
  whatsappOptIn: z.boolean().optional(),
});

export const loginOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
  type: z.enum(["email", "mobile"]),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().optional(),
  skills: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  photoUrl: z.string().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskApplication = typeof taskApplications.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type LegalAcceptance = typeof legalAcceptances.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
