import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db, rawDb } from "./storage";
import { sql } from "drizzle-orm";
import { registerUserSchema, loginOtpSchema, verifyOtpSchema, updateProfileSchema, tasks } from "@shared/schema";
import crypto from "crypto";
import { sendOtpEmail, sendWelcomeEmail, sendAdminNotificationWithReport } from "./email";
import { signToken, requireAuth, setSessionCookie, clearSessionCookie } from "./auth";
import { generateRegistrationReport } from "./report";
import { logRegistrationToBigQuery } from "./analytics";
import { sendSmsOtp, verifySmsOtp, resendSmsOtp } from "./sms";
import { backupDatabase } from "./db-persistence";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(): string {
  return "A2A-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Seed sample tasks
async function seedTasks() {
  const existingTasks = await storage.getTasks();
  if (existingTasks.length > 0) return;

  const sampleTasks = [
    { title: "Image Classification Quality Review", description: "Review and validate 500 image classifications for accuracy. Ensure proper labeling of objects, scenes, and activities in computer vision training data.", category: "Data Annotation", budgetMin: 120, budgetMax: 250, deadline: "2026-05-15", status: "open" },
    { title: "GPT-4 Output Evaluation — Medical Q&A", description: "Evaluate GPT-4 generated answers for medical queries. Assess factual accuracy, completeness, and safety compliance. Medical background preferred.", category: "AI Model Review", budgetMin: 300, budgetMax: 500, deadline: "2026-05-01", status: "open" },
    { title: "Python ML Pipeline Code Audit", description: "Review a production ML pipeline built in Python. Check for bugs, optimization opportunities, and best practices in data preprocessing and model training code.", category: "Code Review", budgetMin: 200, budgetMax: 400, deadline: "2026-04-30", status: "open" },
    { title: "NLP Training Dataset Validation", description: "Validate 2000 text-label pairs in an NLP training dataset. Check for incorrect labels, duplicates, and data quality issues.", category: "Data Validation", budgetMin: 80, budgetMax: 180, deadline: "2026-05-20", status: "open" },
    { title: "Computer Vision Pipeline QA", description: "Test and validate a computer vision ML pipeline end-to-end. Verify data flow, model accuracy benchmarks, and deployment readiness.", category: "ML Pipeline QA", budgetMin: 250, budgetMax: 450, deadline: "2026-05-10", status: "open" },
    { title: "Sentiment Analysis Model Benchmark", description: "Benchmark a sentiment analysis model against industry standards. Evaluate precision, recall, and F1-score across multiple domains.", category: "AI Model Review", budgetMin: 150, budgetMax: 300, deadline: "2026-05-08", status: "open" },
    { title: "Audio Transcription QA Batch", description: "Quality check 100 audio transcriptions for accuracy. Compare against source audio and flag errors in timestamps, speaker labels, and text.", category: "Data Annotation", budgetMin: 50, budgetMax: 120, deadline: "2026-05-25", status: "open" },
    { title: "React TypeScript Frontend Review", description: "Code review of a React TypeScript frontend application. Focus on component architecture, state management, performance, and accessibility.", category: "Code Review", budgetMin: 180, budgetMax: 350, deadline: "2026-04-28", status: "open" },
    { title: "Tabular Data Cleaning & Validation", description: "Clean and validate a 10K-row tabular dataset. Handle missing values, outliers, type inconsistencies, and create a data quality report.", category: "Data Validation", budgetMin: 100, budgetMax: 200, deadline: "2026-05-12", status: "open" },
    { title: "End-to-End ML Model Deployment Review", description: "Review the complete ML deployment pipeline from training to production serving. Evaluate containerization, CI/CD, monitoring, and scaling.", category: "ML Pipeline QA", budgetMin: 350, budgetMax: 500, deadline: "2026-05-05", status: "open" },
  ];

  for (const task of sampleTasks) {
    await storage.createTask(task);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed tasks on startup
  await seedTasks();

  // ===== AUTH ROUTES =====

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { firstName, lastName, email, mobile, referralCode, whatsappOptIn } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        passwordHash: "",
        mobile: mobile || "",
        referralCode: referralCode || generateReferralCode(),
        whatsappOptIn: whatsappOptIn || false,
      });

      // Store legal acceptances
      const ipAddress = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      const now = new Date().toISOString();

      await storage.createLegalAcceptance({
        userId: user.id,
        documentType: "terms_of_use",
        documentVersion: "March 2026 v4",
        documentUrl: "https://a2a.global/terms",
        acceptedAt: now,
        ipAddress,
        userAgent,
      });

      await storage.createLegalAcceptance({
        userId: user.id,
        documentType: "privacy_policy",
        documentVersion: "March 2026 v3.2",
        documentUrl: "https://a2a.global/privacy",
        acceptedAt: now,
        ipAddress,
        userAgent,
      });

      // Generate email OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await storage.deleteVerificationTokens(user.id, "email");
      await storage.createVerificationToken({
        userId: user.id,
        type: "email",
        token: hashPassword(otp),
        expiresAt,
      });

      // Send OTP email via Resend
      await sendOtpEmail(email, firstName, otp);

      // Send admin notification with Excel report + log to BigQuery (async)
      const clientIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown";
      const clientUa = req.headers["user-agent"] || "unknown";
      
      (async () => {
        try {
          const allUsers = await storage.getAllUsers();
          const reportBuffer = await generateRegistrationReport(allUsers);
          await sendAdminNotificationWithReport(
            { firstName, lastName, email },
            allUsers.length,
            reportBuffer
          );
          // Log to BigQuery
          await logRegistrationToBigQuery({
            userId: user.id,
            firstName,
            lastName,
            email,
            referralCode: referralCode || null,
            ipAddress: clientIp,
            userAgent: clientUa,
            registeredAt: new Date().toISOString(),
            emailVerified: false,
            source: "web_registration",
          });
          // Backup DB to GCS after registration
          await backupDatabase();
        } catch (err) {
          console.error("Failed to send admin report or log analytics:", err);
        }
      })();

      return res.status(201).json({
        message: "Registration successful. Please verify your email.",
        userId: user.id,
        email: user.email,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const parsed = verifyOtpSchema.safeParse({ ...req.body, type: "email" });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = await storage.getVerificationToken(user.id, "email");
      if (!token) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }

      if (new Date(token.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Verification code expired. Please request a new one." });
      }

      if (token.token !== hashPassword(parsed.data.otp)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.updateUser(user.id, { emailVerified: true });
      await storage.deleteVerificationTokens(user.id, "email");

      // Send welcome email
      await sendWelcomeEmail(user.email, user.firstName);

      // Issue JWT session token + set cookie
      const sessionToken = signToken({ userId: user.id, email: user.email });
      setSessionCookie(res, sessionToken);

      return res.json({
        message: "Email verified successfully. Registration complete!",
        token: sessionToken,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/verify-mobile", async (req, res) => {
    try {
      const parsed = verifyOtpSchema.safeParse({ ...req.body, type: "mobile" });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = await storage.getVerificationToken(user.id, "mobile");
      if (!token) {
        return res.status(400).json({ message: "No verification code found" });
      }

      if (new Date(token.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Code expired" });
      }

      if (token.token !== hashPassword(parsed.data.otp)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.updateUser(user.id, {
        mobileVerified: true,
        mobileVerifiedVia: req.body.via || "sms",
      });
      await storage.deleteVerificationTokens(user.id, "mobile");

      return res.json({ message: "Mobile verified successfully. Registration complete!" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Login via email OTP — Step 1: Send OTP
  app.post("/api/auth/login-otp", async (req, res) => {
    try {
      const parsed = loginOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email. Please register first." });
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await storage.deleteVerificationTokens(user.id, "login");
      await storage.createVerificationToken({
        userId: user.id,
        type: "login",
        token: hashPassword(otp),
        expiresAt,
      });

      // Send OTP email
      await sendOtpEmail(user.email, user.firstName, otp);

      return res.json({
        message: "Verification code sent to your email",
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Login via email OTP — Step 2: Verify OTP
  app.post("/api/auth/verify-login", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = await storage.getVerificationToken(user.id, "login");
      if (!token) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }

      if (new Date(token.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Code expired. Please request a new one." });
      }

      if (token.token !== hashPassword(otp)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.deleteVerificationTokens(user.id, "login");

      // Issue JWT session token + set cookie
      const sessionToken = signToken({ userId: user.id, email: user.email });
      setSessionCookie(res, sessionToken);

      return res.json({
        message: "Login successful",
        token: sessionToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          emailVerified: user.emailVerified,
          mobileVerified: user.mobileVerified,
          kycStatus: user.kycStatus,
          referralCode: user.referralCode,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { email, type } = req.body;
      if (!email || !type) {
        return res.status(400).json({ message: "Email and type are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await storage.deleteVerificationTokens(user.id, type);
      await storage.createVerificationToken({
        userId: user.id,
        type,
        token: hashPassword(otp),
        expiresAt,
      });

      // Send OTP email
      if (type === "email" || type === "login") {
        await sendOtpEmail(email, user.firstName, otp);
      }

      return res.json({ message: `OTP sent to your ${type}` });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== SESSION =====

  // Check current session (called on page load)
  app.get("/api/auth/session", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { passwordHash, ...profile } = user;
    return res.json({ authenticated: true, user: profile });
  });

  // Logout
  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    return res.json({ message: "Logged out" });
  });

  // ===== SMS MOBILE VERIFICATION =====

  // Send SMS OTP to verify mobile number (called from dashboard profile)
  app.post("/api/auth/send-mobile-otp", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { mobile } = req.body;
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      // Save mobile to user profile
      await storage.updateUser(userId, { mobile });

      // Send OTP via MSG91
      const result = await sendSmsOtp(mobile);
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send SMS OTP" });
      }

      return res.json({ message: "OTP sent to your mobile number", requestId: result.requestId });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Verify SMS OTP
  app.post("/api/auth/verify-mobile-otp", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { mobile, otp } = req.body;
      if (!mobile || !otp) {
        return res.status(400).json({ message: "Mobile number and OTP are required" });
      }

      // Verify with MSG91
      const result = await verifySmsOtp(mobile, otp);
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Invalid OTP" });
      }

      // Mark mobile as verified
      await storage.updateUser(userId, { mobileVerified: true, mobileVerifiedVia: "sms" });

      return res.json({ message: "Mobile number verified successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Resend SMS OTP
  app.post("/api/auth/resend-mobile-otp", requireAuth, async (req, res) => {
    try {
      const { mobile, retryType } = req.body;
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      const result = await resendSmsOtp(mobile, retryType || "text");
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to resend OTP" });
      }

      return res.json({ message: "OTP resent successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== USER/DASHBOARD ROUTES =====

  app.get("/api/user/profile", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { passwordHash, ...profile } = user;
    return res.json(profile);
  });

  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const updated = await storage.updateUser(userId, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const { passwordHash, ...profile } = updated;
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.get("/api/tasks", async (_req, res) => {
    const allTasks = await storage.getTasks();
    return res.json(allTasks);
  });

  app.post("/api/tasks/:id/apply", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = (req as any).userId;
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const application = await storage.applyForTask(taskId, userId);
      return res.json({ message: "Applied successfully", application });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.get("/api/user/tasks", async (req, res) => {
    const userId = (req as any).userId;
    const apps = await storage.getUserApplications(userId);
    return res.json(apps);
  });

  app.get("/api/user/payments", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const paymentList = await storage.getUserPayments(userId);
    return res.json(paymentList);
  });

  app.get("/api/user/referrals", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const stats = await storage.getReferralStats(userId);
    const referralList = await storage.getUserReferrals(userId);
    return res.json({ stats, referrals: referralList });
  });

  // ===== ADMIN ROUTES =====

  app.get("/api/admin/stats", async (_req, res) => {
    const total = await storage.getUserCount();
    const newToday = await storage.getNewUsersToday();
    const verification = await storage.getVerificationBreakdown();
    return res.json({ totalUsers: total, newToday, verification });
  });

  app.post("/api/admin/send-digest", async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const reportBuffer = await generateRegistrationReport(allUsers);
    await sendAdminNotificationWithReport(
      { firstName: "Manual", lastName: "Digest", email: "admin" },
      allUsers.length,
      reportBuffer
    );
    return res.json({
      message: "Digest email with Excel report sent",
      recipients: ["oleg@a2a.global", "amir@a2a.global"],
      totalUsers: allUsers.length,
    });
  });


  // ===== REFERRAL SYSTEM =====

  app.get("/api/user/referral-stats", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const referralCode = user.referralCode || "";
    const referralLink = `https://a2a-registration-506299896481.us-central1.run.app/#/auth/signup?ref=${referralCode}`;
    const referrals = await storage.getUserReferrals(userId);
    const totalReferred = referrals.length;
    const verifiedReferred = referrals.filter((r: any) => r.status === "verified").length;
    const totalEarned = referrals.reduce((sum: number, r: any) => sum + (r.earnedAmount || 0), 0);

    return res.json({
      referralCode,
      referralLink,
      totalReferred,
      verifiedReferred,
      totalEarned: totalEarned / 100,
      referrals,
    });
  });

  // ===== SUPER ADMIN DASHBOARD =====

  const ADMIN_EMAILS = ["amir@a2a.global", "oleg@a2a.global"];
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "A2A$uperAdmin2026!";

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ message: "Access denied" });
      if (password !== ADMIN_PASSWORD) return res.status(401).json({ message: "Invalid password" });

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      (global as any).__adminOtps = (global as any).__adminOtps || {};
      (global as any).__adminOtps[email] = { otp: hashPassword(otp), expiresAt };
      await sendOtpEmail(email, "Admin", otp);

      return res.json({ message: "OTP sent to your email", requireOtp: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ message: "Access denied" });

      const stored = (global as any).__adminOtps?.[email];
      if (!stored) return res.status(400).json({ message: "No OTP found" });
      if (new Date(stored.expiresAt) < new Date()) return res.status(400).json({ message: "OTP expired" });
      if (stored.otp !== hashPassword(otp)) return res.status(400).json({ message: "Invalid OTP" });

      delete (global as any).__adminOtps[email];
      const token = signToken({ userId: 0, email });
      setSessionCookie(res, token);

      return res.json({ message: "Admin login successful", token, isAdmin: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/dashboard", requireAuth, async (req, res) => {
    const userEmail = (req as any).userEmail;
    if (!ADMIN_EMAILS.includes(userEmail)) return res.status(403).json({ message: "Admin access only" });

    const allUsers = await storage.getAllUsers();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= todayStart);
    const weekUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= weekStart);
    const monthUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= monthStart);
    const emailVerified = allUsers.filter(u => u.emailVerified).length;
    const mobileVerified = allUsers.filter(u => u.mobileVerified).length;
    const kycStarted = allUsers.filter(u => u.kycStatus && u.kycStatus !== "not_started").length;

    const dailyMap = new Map<string, number>();
    allUsers.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "unknown";
      dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
    });

    return res.json({
      overview: { totalUsers: allUsers.length, todayRegistrations: todayUsers.length, weekRegistrations: weekUsers.length, monthRegistrations: monthUsers.length },
      verification: { emailVerified, mobileVerified, kycStarted, emailRate: allUsers.length > 0 ? Math.round((emailVerified / allUsers.length) * 100) : 0, mobileRate: allUsers.length > 0 ? Math.round((mobileVerified / allUsers.length) * 100) : 0, kycRate: allUsers.length > 0 ? Math.round((kycStarted / allUsers.length) * 100) : 0 },
      dailyBreakdown: Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
      tickets: rawDb.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 20").all(),
      recentUsers: allUsers.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 20).map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email, mobile: u.mobile || "—", emailVerified: u.emailVerified, mobileVerified: u.mobileVerified, kycStatus: u.kycStatus, createdAt: u.createdAt })),
    });
  });

  // Support ticket logging
  app.post("/api/support/ticket", async (req, res) => {
    try {
      const { email, channel, message } = req.body;
      rawDb.prepare("INSERT INTO support_tickets (user_email, channel, message) VALUES (?, ?, ?)").run(email || "anonymous", channel || "web", message || "");
      await backupDatabase();
      return res.json({ message: "Support ticket created" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Admin: get support tickets
  app.get("/api/admin/tickets", requireAuth, async (req, res) => {
    const userEmail = (req as any).userEmail;
    if (!ADMIN_EMAILS.includes(userEmail)) return res.status(403).json({ message: "Admin access only" });
    const tickets = rawDb.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 50").all();
    return res.json(tickets);
  });

  app.get("/api/admin/report", requireAuth, async (req, res) => {
    const userEmail = (req as any).userEmail;
    if (!ADMIN_EMAILS.includes(userEmail)) return res.status(403).json({ message: "Admin access only" });
    const allUsers = await storage.getAllUsers();
    const reportBuffer = await generateRegistrationReport(allUsers);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=A2A_Global_Users_${date}.xlsx`);
    return res.send(reportBuffer);
  });


  return httpServer;
}

