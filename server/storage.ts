import {
  type User, type InsertUser, type Task, type InsertTask,
  type TaskApplication, type Payment, type Referral, type LegalAcceptance,
  type VerificationToken,
  users, tasks, taskApplications, payments, referrals, legalAcceptances, verificationTokens,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  getNewUsersToday(): Promise<number>;
  getVerificationBreakdown(): Promise<{ emailVerified: number; mobileVerified: number; total: number }>;

  // Legal
  createLegalAcceptance(data: Omit<LegalAcceptance, "id">): Promise<LegalAcceptance>;

  // Verification
  createVerificationToken(data: Omit<VerificationToken, "id" | "createdAt">): Promise<VerificationToken>;
  getVerificationToken(userId: number, type: string): Promise<VerificationToken | undefined>;
  deleteVerificationTokens(userId: number, type: string): Promise<void>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;

  // Task Applications
  applyForTask(taskId: number, userId: number): Promise<TaskApplication>;
  getUserApplications(userId: number): Promise<(TaskApplication & { task?: Task })[]>;

  // Payments
  getUserPayments(userId: number): Promise<Payment[]>;

  // Referrals
  getUserReferrals(userId: number): Promise<Referral[]>;
  getReferralStats(userId: number): Promise<{ referred: number; registered: number; earned: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    return db.update(users).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(users.id, id)).returning().get();
  }

  async getUserCount(): Promise<number> {
    const result = db.select({ count: sql<number>`count(*)` }).from(users).get();
    return result?.count ?? 0;
  }

  async getNewUsersToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = db.select({ count: sql<number>`count(*)` }).from(users).where(sql`date(${users.createdAt}) = ${today}`).get();
    return result?.count ?? 0;
  }

  async getVerificationBreakdown(): Promise<{ emailVerified: number; mobileVerified: number; total: number }> {
    const total = await this.getUserCount();
    const emailResult = db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.emailVerified, true)).get();
    const mobileResult = db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.mobileVerified, true)).get();
    return {
      emailVerified: emailResult?.count ?? 0,
      mobileVerified: mobileResult?.count ?? 0,
      total,
    };
  }

  async createLegalAcceptance(data: Omit<LegalAcceptance, "id">): Promise<LegalAcceptance> {
    return db.insert(legalAcceptances).values(data).returning().get();
  }

  async createVerificationToken(data: Omit<VerificationToken, "id" | "createdAt">): Promise<VerificationToken> {
    return db.insert(verificationTokens).values(data).returning().get();
  }

  async getVerificationToken(userId: number, type: string): Promise<VerificationToken | undefined> {
    return db.select().from(verificationTokens)
      .where(and(eq(verificationTokens.userId, userId), eq(verificationTokens.type, type)))
      .orderBy(desc(verificationTokens.createdAt))
      .get();
  }

  async deleteVerificationTokens(userId: number, type: string): Promise<void> {
    db.delete(verificationTokens)
      .where(and(eq(verificationTokens.userId, userId), eq(verificationTokens.type, type)))
      .run();
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
  }

  async getTask(id: number): Promise<Task | undefined> {
    return db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  async createTask(task: InsertTask): Promise<Task> {
    return db.insert(tasks).values(task).returning().get();
  }

  async applyForTask(taskId: number, userId: number): Promise<TaskApplication> {
    return db.insert(taskApplications).values({ taskId, userId }).returning().get();
  }

  async getUserApplications(userId: number): Promise<(TaskApplication & { task?: Task })[]> {
    const apps = db.select().from(taskApplications).where(eq(taskApplications.userId, userId)).orderBy(desc(taskApplications.appliedAt)).all();
    const results: (TaskApplication & { task?: Task })[] = [];
    for (const app of apps) {
      const task = db.select().from(tasks).where(eq(tasks.id, app.taskId)).get();
      results.push({ ...app, task });
    }
    return results;
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).all();
  }

  async getUserReferrals(userId: number): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt)).all();
  }

  async getReferralStats(userId: number): Promise<{ referred: number; registered: number; earned: number }> {
    const refs = await this.getUserReferrals(userId);
    return {
      referred: refs.length,
      registered: refs.filter(r => r.status === "registered").length,
      earned: refs.reduce((sum, r) => sum + (r.earnedAmount ?? 0), 0),
    };
  }
}

export const storage = new DatabaseStorage();
