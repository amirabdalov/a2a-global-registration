import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { registerUserSchema, loginOtpSchema, verifyOtpSchema, updateProfileSchema, tasks } from "@shared/schema";
import crypto from "crypto";

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

      // In production, send email with OTP. For demo, return it.
      return res.status(201).json({
        message: "Registration successful. Please verify your email.",
        userId: user.id,
        email: user.email,
        _devOtp: otp,
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

      return res.json({
        message: "Email verified successfully. Registration complete!",
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

      return res.json({
        message: "Verification code sent to your email",
        _devOtp: otp,
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

      return res.json({
        message: "Login successful",
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

      return res.json({ message: `OTP sent to your ${type}`, _devOtp: otp });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ===== USER/DASHBOARD ROUTES =====

  app.get("/api/user/profile", async (req, res) => {
    const userId = parseInt(req.headers["x-user-id"] as string) || 1;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { passwordHash, ...profile } = user;
    return res.json(profile);
  });

  app.put("/api/user/profile", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string) || 1;
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

  app.post("/api/tasks/:id/apply", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = parseInt(req.headers["x-user-id"] as string) || 1;
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
    const userId = parseInt(req.headers["x-user-id"] as string) || 1;
    const apps = await storage.getUserApplications(userId);
    return res.json(apps);
  });

  app.get("/api/user/payments", async (req, res) => {
    const userId = parseInt(req.headers["x-user-id"] as string) || 1;
    const paymentList = await storage.getUserPayments(userId);
    return res.json(paymentList);
  });

  app.get("/api/user/referrals", async (req, res) => {
    const userId = parseInt(req.headers["x-user-id"] as string) || 1;
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
    // In production, send email. For demo, just return success.
    return res.json({
      message: "Digest email would be sent to oleg@a2a.global and amir@a2a.global",
      recipients: ["oleg@a2a.global", "amir@a2a.global"],
    });
  });

  return httpServer;
}
