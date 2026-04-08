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
import { matchExpertsToTask } from "./matching";

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

      const { firstName, lastName, email, mobile, referralCode, whatsappOptIn, userType } = parsed.data;

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
        userType: userType || "expert",
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
      const taskId = parseInt(req.params.id as string);
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


  // ===== EXPERT PROFILE ROUTES =====

  // POST /api/expert/profile — create or update expert profile
  app.post("/api/expert/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { domains, bio, hourlyRate, availability } = req.body;

      const existing = rawDb.prepare("SELECT id FROM expert_profiles WHERE user_id = ?").get(userId) as any;

      if (existing) {
        rawDb.prepare(
          `UPDATE expert_profiles SET
            domains = COALESCE(?, domains),
            bio = COALESCE(?, bio),
            hourly_rate = COALESCE(?, hourly_rate),
            availability = COALESCE(?, availability)
          WHERE user_id = ?`
        ).run(
          domains !== undefined ? JSON.stringify(domains) : null,
          bio !== undefined ? bio : null,
          hourlyRate !== undefined ? hourlyRate : null,
          availability !== undefined ? availability : null,
          userId
        );
      } else {
        rawDb.prepare(
          `INSERT INTO expert_profiles (user_id, domains, bio, hourly_rate, availability)
           VALUES (?, ?, ?, ?, ?)`
        ).run(
          userId,
          domains !== undefined ? JSON.stringify(domains) : '[]',
          bio || null,
          hourlyRate || 0,
          availability || 'available'
        );
      }

      const profile = rawDb.prepare("SELECT * FROM expert_profiles WHERE user_id = ?").get(userId);
      await backupDatabase();
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // GET /api/expert/profile — get current expert's profile
  app.get("/api/expert/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = rawDb.prepare("SELECT * FROM expert_profiles WHERE user_id = ?").get(userId);
      if (!profile) {
        return res.status(404).json({ message: "Expert profile not found" });
      }
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== CLIENT PROFILE ROUTES =====

  // POST /api/client/profile — create client profile
  app.post("/api/client/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { companyName, industry } = req.body;

      const existing = rawDb.prepare("SELECT id FROM client_profiles WHERE user_id = ?").get(userId) as any;

      if (existing) {
        rawDb.prepare(
          `UPDATE client_profiles SET
            company_name = COALESCE(?, company_name),
            industry = COALESCE(?, industry)
          WHERE user_id = ?`
        ).run(
          companyName !== undefined ? companyName : null,
          industry !== undefined ? industry : null,
          userId
        );
      } else {
        rawDb.prepare(
          `INSERT INTO client_profiles (user_id, company_name, industry) VALUES (?, ?, ?)`
        ).run(userId, companyName || null, industry || null);
      }

      const profile = rawDb.prepare("SELECT * FROM client_profiles WHERE user_id = ?").get(userId);
      await backupDatabase();
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // GET /api/client/profile — get client profile
  app.get("/api/client/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = rawDb.prepare("SELECT * FROM client_profiles WHERE user_id = ?").get(userId);
      if (!profile) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== ENGAGEMENT ROUTES =====

  // POST /api/engagements — Client creates a new task
  app.post("/api/engagements", requireAuth, async (req, res) => {
    try {
      const clientId = (req as any).userId;
      const { title, description, domain, aiOutput, budget } = req.body;

      if (!title || !domain) {
        return res.status(400).json({ message: "title and domain are required" });
      }

      const result = rawDb.prepare(
        `INSERT INTO engagements (client_id, title, description, domain, ai_output, budget, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`
      ).run(clientId, title, description || null, domain, aiOutput || null, budget || 0);

      // Increment client total_tasks
      rawDb.prepare(
        `UPDATE client_profiles SET total_tasks = total_tasks + 1 WHERE user_id = ?`
      ).run(clientId);

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(result.lastInsertRowid);
      await backupDatabase();
      return res.status(201).json(engagement);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // GET /api/engagements — List engagements by role
  app.get("/api/engagements", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      let engagements: any[];
      if (user.userType === "client") {
        engagements = rawDb.prepare(
          "SELECT * FROM engagements WHERE client_id = ? ORDER BY created_at DESC"
        ).all(userId);
      } else {
        // Expert: see assigned engagements
        engagements = rawDb.prepare(
          "SELECT * FROM engagements WHERE expert_id = ? ORDER BY created_at DESC"
        ).all(userId);
      }

      return res.json(engagements);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // GET /api/engagements/:id — Get engagement details
  app.get("/api/engagements/:id", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id as string);
      const userId = (req as any).userId;

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId) as any;
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }

      // Only client or assigned expert can view
      if (engagement.client_id !== userId && engagement.expert_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json(engagement);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // POST /api/engagements/:id/review — Expert submits review with error annotations
  app.post("/api/engagements/:id/review", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id as string);
      const expertId = (req as any).userId;
      const { expertReview, errorAnnotations } = req.body;

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId) as any;
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      if (engagement.expert_id !== expertId) {
        return res.status(403).json({ message: "Only the assigned expert can submit a review" });
      }
      if (engagement.status !== "assigned") {
        return res.status(400).json({ message: "Engagement must be in assigned status" });
      }

      const annotationsJson = JSON.stringify(errorAnnotations || []);

      rawDb.prepare(
        `UPDATE engagements SET expert_review = ?, error_annotations = ?, status = 'reviewed' WHERE id = ?`
      ).run(expertReview || null, annotationsJson, engagementId);

      // Auto-extract training signals from error annotations
      const annotations: any[] = errorAnnotations || [];
      for (const annotation of annotations) {
        rawDb.prepare(
          `INSERT INTO training_signals
            (engagement_id, domain, error_type, severity, original_output, expert_correction, signal_type)
           VALUES (?, ?, ?, ?, ?, ?, 'correction')`
        ).run(
          engagementId,
          engagement.domain,
          annotation.errorType || annotation.error_type || null,
          annotation.severity || null,
          annotation.originalOutput || annotation.original_output || engagement.ai_output || null,
          annotation.correction || annotation.expertCorrection || null
        );
      }

      // Update expert stats: increment total_reviews
      rawDb.prepare(
        `UPDATE expert_profiles SET total_reviews = total_reviews + 1 WHERE user_id = ?`
      ).run(expertId);

      const updated = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId);
      await backupDatabase();
      return res.json({ message: "Review submitted", engagement: updated });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // POST /api/engagements/:id/feedback — Client or Expert submits rating + feedback
  app.post("/api/engagements/:id/feedback", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id as string);
      const userId = (req as any).userId;
      const { rating, feedback } = req.body;

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId) as any;
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }

      let updateSql: string;
      if (engagement.client_id === userId) {
        updateSql = `UPDATE engagements SET client_rating = ?, client_feedback = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?`;
      } else if (engagement.expert_id === userId) {
        updateSql = `UPDATE engagements SET expert_rating = ?, expert_feedback = ? WHERE id = ?`;
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      rawDb.prepare(updateSql).run(rating || null, feedback || null, engagementId);

      // If client feedback, update expert's avg_rating
      if (engagement.client_id === userId && rating && engagement.expert_id) {
        const expertProfile = rawDb.prepare(
          "SELECT total_reviews, avg_rating FROM expert_profiles WHERE user_id = ?"
        ).get(engagement.expert_id) as any;
        if (expertProfile) {
          const newTotal = expertProfile.total_reviews;
          const newAvg = newTotal > 0
            ? ((expertProfile.avg_rating * (newTotal - 1)) + rating) / newTotal
            : rating;
          rawDb.prepare(
            `UPDATE expert_profiles SET avg_rating = ? WHERE user_id = ?`
          ).run(Math.round(newAvg * 100) / 100, engagement.expert_id);
        }
      }

      const updated = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId);
      await backupDatabase();
      return res.json({ message: "Feedback submitted", engagement: updated });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== MATCHING ROUTES =====

  // POST /api/engagements/:id/match — Find matching experts
  app.post("/api/engagements/:id/match", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id as string);
      const userId = (req as any).userId;

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId) as any;
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      if (engagement.client_id !== userId) {
        return res.status(403).json({ message: "Only the client can trigger matching" });
      }

      // Fetch all expert profiles
      const experts = rawDb.prepare("SELECT * FROM expert_profiles").all() as any[];

      // Run matching algorithm
      const matches = matchExpertsToTask(experts, {
        id: engagement.id,
        domain: engagement.domain,
        budget: engagement.budget,
        title: engagement.title,
        description: engagement.description,
      });

      // Record match history
      for (const match of matches) {
        rawDb.prepare(
          `INSERT INTO match_history (engagement_id, expert_id, client_id, match_score)
           VALUES (?, ?, ?, ?)`
        ).run(engagementId, match.expert.user_id, userId, match.score);
      }

      await backupDatabase();
      return res.json({
        engagementId,
        matches: matches.map(m => ({
          expertUserId: m.expert.user_id,
          tier: m.expert.tier,
          avgRating: m.expert.avg_rating,
          hourlyRate: m.expert.hourly_rate,
          totalReviews: m.expert.total_reviews,
          score: m.score,
          matchReasons: m.matchReasons,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // POST /api/engagements/:id/assign — Assign expert to engagement
  app.post("/api/engagements/:id/assign", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id as string);
      const userId = (req as any).userId;
      const { expertUserId } = req.body;

      if (!expertUserId) {
        return res.status(400).json({ message: "expertUserId is required" });
      }

      const engagement = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId) as any;
      if (!engagement) {
        return res.status(404).json({ message: "Engagement not found" });
      }
      if (engagement.client_id !== userId) {
        return res.status(403).json({ message: "Only the client can assign an expert" });
      }

      // Verify expert profile exists
      const expertProfile = rawDb.prepare(
        "SELECT * FROM expert_profiles WHERE user_id = ?"
      ).get(expertUserId) as any;
      if (!expertProfile) {
        return res.status(404).json({ message: "Expert profile not found" });
      }

      rawDb.prepare(
        `UPDATE engagements SET expert_id = ?, status = 'assigned' WHERE id = ?`
      ).run(expertUserId, engagementId);

      const updated = rawDb.prepare("SELECT * FROM engagements WHERE id = ?").get(engagementId);
      await backupDatabase();
      return res.json({ message: "Expert assigned", engagement: updated });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== QUALIFICATION TEST ROUTES =====

  // GET /api/tests — List available qualification tests
  app.get("/api/tests", requireAuth, async (req, res) => {
    try {
      const tests = rawDb.prepare(
        "SELECT id, domain, title, passing_score, tier_required, created_at FROM qualification_tests ORDER BY created_at DESC"
      ).all();
      return res.json(tests);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // GET /api/tests/:id — Get test questions
  app.get("/api/tests/:id", requireAuth, async (req, res) => {
    try {
      const testId = parseInt(req.params.id as string);
      const test = rawDb.prepare("SELECT * FROM qualification_tests WHERE id = ?").get(testId) as any;
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      // Parse questions JSON before returning
      try {
        test.questions = JSON.parse(test.questions);
      } catch {
        // Leave as string if parse fails
      }
      return res.json(test);
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // POST /api/tests/:id/submit — Submit test answers, get score, update tier
  app.post("/api/tests/:id/submit", requireAuth, async (req, res) => {
    try {
      const testId = parseInt(req.params.id as string);
      const userId = (req as any).userId;
      const { answers } = req.body;

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "answers must be an array" });
      }

      const test = rawDb.prepare("SELECT * FROM qualification_tests WHERE id = ?").get(testId) as any;
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }

      let questions: any[] = [];
      try {
        questions = JSON.parse(test.questions);
      } catch {
        return res.status(500).json({ message: "Invalid test data" });
      }

      // Score the test: each question has a 'correctAnswer' field
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const userAnswer = answers[i];
        if (q.correctAnswer !== undefined && userAnswer === q.correctAnswer) {
          correct++;
        }
      }

      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= test.passing_score ? 1 : 0;

      // Record attempt
      rawDb.prepare(
        `INSERT INTO test_attempts (user_id, test_id, answers, score, passed)
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, testId, JSON.stringify(answers), score, passed);

      // If passed, update expert tier and test_scores
      if (passed) {
        const expertProfile = rawDb.prepare(
          "SELECT * FROM expert_profiles WHERE user_id = ?"
        ).get(userId) as any;

        if (expertProfile) {
          let testScores: Record<string, number> = {};
          try {
            testScores = JSON.parse(expertProfile.test_scores || "{}");
          } catch {
            testScores = {};
          }
          testScores[test.domain] = score;

          // Upgrade tier based on test tier_required
          const tierRank: Record<string, number> = { standard: 1, pro: 2, guru: 3 };
          const currentRank = tierRank[expertProfile.tier] || 1;
          const requiredRank = tierRank[test.tier_required] || 1;
          const newTier = requiredRank > currentRank ? test.tier_required : expertProfile.tier;

          rawDb.prepare(
            `UPDATE expert_profiles SET test_scores = ?, tier = ? WHERE user_id = ?`
          ).run(JSON.stringify(testScores), newTier, userId);
        }
      }

      await backupDatabase();
      return res.json({
        score,
        passed: passed === 1,
        passingScore: test.passing_score,
        tierRequired: test.tier_required,
        correct,
        total: questions.length,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  return httpServer;
}

