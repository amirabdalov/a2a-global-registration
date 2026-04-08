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

// Auto-create tables on startup (no need for drizzle-kit push)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    mobile TEXT,
    email_verified INTEGER DEFAULT 0,
    mobile_verified INTEGER DEFAULT 0,
    mobile_verified_via TEXT,
    referral_code TEXT,
    whatsapp_opt_in INTEGER DEFAULT 0,
    kyc_status TEXT DEFAULT 'not_started',
    dashboard_link TEXT,
    status TEXT DEFAULT 'pending_verification',
    bio TEXT,
    skills TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    language TEXT DEFAULT 'en',
    photo_url TEXT,
    referred_by INTEGER,
    user_type TEXT DEFAULT 'expert',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS legal_acceptances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_version TEXT NOT NULL,
    document_url TEXT,
    accepted_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT
  );
  CREATE TABLE IF NOT EXISTS verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    budget_min INTEGER,
    budget_max INTEGER,
    deadline TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS task_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    applied_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_email TEXT,
    channel TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_user_id INTEGER,
    status TEXT DEFAULT 'pending',
    earned_amount INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS expert_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    domains TEXT DEFAULT '[]',
    tier TEXT DEFAULT 'standard',
    bio TEXT,
    hourly_rate INTEGER DEFAULT 0,
    test_scores TEXT DEFAULT '{}',
    total_reviews INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    availability TEXT DEFAULT 'available',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS client_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    company_name TEXT,
    industry TEXT,
    total_tasks INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    expert_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    domain TEXT NOT NULL,
    ai_output TEXT,
    status TEXT DEFAULT 'open',
    budget INTEGER DEFAULT 0,
    expert_review TEXT,
    error_annotations TEXT DEFAULT '[]',
    client_rating INTEGER,
    expert_rating INTEGER,
    client_feedback TEXT,
    expert_feedback TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS qualification_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    questions TEXT NOT NULL,
    passing_score INTEGER DEFAULT 70,
    tier_required TEXT DEFAULT 'guru',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS test_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    score INTEGER NOT NULL,
    passed INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS training_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engagement_id INTEGER NOT NULL,
    domain TEXT NOT NULL,
    error_type TEXT,
    severity TEXT,
    original_output TEXT,
    expert_correction TEXT,
    signal_type TEXT DEFAULT 'correction',
    processed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS match_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engagement_id INTEGER NOT NULL,
    expert_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    match_score REAL,
    outcome_score REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export const db = drizzle(sqlite);
export const rawDb = sqlite; // Raw better-sqlite3 instance for direct SQL

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).all();
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

// Seed qualification tests if table is empty
function seedTests() {
  const count = rawDb.prepare("SELECT COUNT(*) as c FROM qualification_tests").get() as any;
  if (count?.c === 0) {
    try {
      const testData = require("./test-seed.json");
      for (const test of testData) {
        rawDb.prepare(
          "INSERT INTO qualification_tests (domain, title, questions, passing_score, tier_required) VALUES (?, ?, ?, ?, ?)"
        ).run(test.domain, test.title, JSON.stringify(test.questions), test.passing_score, "guru");
      }
      console.log(`[SEED] Loaded ${testData.length} qualification tests`);
    } catch (e) {
      console.log("[SEED] No test data file found, skipping seed");
    }
  }
}

// Seed sample tasks if empty
function seedTasks() {
  const count = rawDb.prepare("SELECT COUNT(*) as c FROM tasks").get() as any;
  if (count?.c === 0) {
    const sampleTasks = [
      { title: "Review AI Investment Analysis Report", description: "Review and validate an AI-generated DCF valuation model for a Series B SaaS company. Identify errors in assumptions, methodology, and conclusions.", category: "finance_investment", budgetMin: 200, budgetMax: 500 },
      { title: "Second Opinion on AI Business Strategy", description: "Client received an AI-generated market entry strategy for Southeast Asia. Review competitive analysis, risk assessment, and go-to-market recommendations.", category: "business_strategy", budgetMin: 150, budgetMax: 400 },
      { title: "Validate AI Product Roadmap Recommendations", description: "An AI tool generated a 12-month product roadmap for a B2B SaaS platform. Review prioritization logic, technical feasibility, and market alignment.", category: "product_strategy", budgetMin: 100, budgetMax: 300 },
      { title: "Review AI-Generated Pitch Deck Analysis", description: "Client submitted an AI-analyzed pitch deck for investor presentation. Verify financial projections, market sizing, and competitive positioning.", category: "fundraising", budgetMin: 250, budgetMax: 600 },
      { title: "Audit AI Code Review Suggestions", description: "An AI tool reviewed a Node.js microservices architecture and suggested refactoring. Validate the recommendations for correctness and best practices.", category: "software_development", budgetMin: 120, budgetMax: 350 },
      { title: "Expert Review of AI Legal Contract Analysis", description: "AI analyzed a SaaS enterprise agreement and flagged potential risks. Verify the analysis accuracy and identify any missed clauses.", category: "legal", budgetMin: 300, budgetMax: 700 },
      { title: "Validate AI Startup Valuation Model", description: "Review an AI-generated startup valuation using multiple methods (DCF, comparables, VC method). Check for common AI biases and errors.", category: "finance_investment", budgetMin: 200, budgetMax: 500 },
      { title: "Review AI Entrepreneurship Assessment", description: "Client received an AI-generated business viability assessment for a new fintech product. Validate market assumptions and growth projections.", category: "entrepreneurship", budgetMin: 100, budgetMax: 250 },
      { title: "Second Opinion on AI Sprint Planning", description: "An AI tool created sprint planning recommendations for an agile team. Review story point estimates, sprint velocity assumptions, and capacity planning.", category: "agile_software_development", budgetMin: 80, budgetMax: 200 },
      { title: "Validate AI PayTech Compliance Review", description: "AI analyzed payment processing compliance requirements for a cross-border fintech. Verify regulatory accuracy across US, EU, and India jurisdictions.", category: "fintech_paytech", budgetMin: 400, budgetMax: 800 },
    ];
    
    for (const task of sampleTasks) {
      const deadline = new Date(Date.now() + 14 * 86400000).toISOString();
      rawDb.prepare(
        "INSERT INTO tasks (title, description, category, budget_min, budget_max, deadline) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(task.title, task.description, task.category, task.budgetMin, task.budgetMax, deadline);
    }
    console.log(`[SEED] Loaded ${sampleTasks.length} sample tasks`);
  }
}

try { seedTests(); } catch(e) { console.error("[SEED] Test seed error:", e); }
try { seedTasks(); } catch(e) { console.error("[SEED] Task seed error:", e); }
