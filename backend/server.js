/**
 * Help Rehab Clinic — Express API Server
 * Stack: Express · MongoDB Atlas (Mongoose) · JWT · Helmet · Rate-limiting
 */

require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const path      = require("path");

// ── Route Imports ────────────────────────────────────────────
const authRouter         = require("./routes/auth");
const inquiriesRouter    = require("./routes/inquiries");
const appointmentsRouter = require("./routes/appointments");
const {
  patientsRouter,
  doctorsRouter,
  servicesRouter,
  dashboardRouter,
  adminsRouter,
} = require("./routes/resources");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:         process.env.CORS_ORIGIN || "*",
  methods:        ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate Limiting ─────────────────────────────────────────────
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { error: "Too many login attempts, please wait." } });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: { error: "Too many inquiries from this IP. Please call us directly." } });

// ── API Routes ────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "rehab-clinic-api", version: "2.0.0", timestamp: new Date().toISOString() }));

app.use("/api/auth",     authLimiter, authRouter);
app.use("/api/inquiries", (req, res, next) => { if (req.method === "POST") return contactLimiter(req, res, next); next(); }, inquiriesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/patients",     patientsRouter);
app.use("/api/doctors",      doctorsRouter);
app.use("/api/services",     servicesRouter);
app.use("/api/dashboard",    dashboardRouter);
app.use("/api/admin-users",  adminsRouter);

// ── Serve Frontend ────────────────────────────────────────────
const FRONTEND_DIST = path.join(__dirname, "../frontend/public");
app.use(express.static(FRONTEND_DIST));

// Explicit admin route
app.get("/admin", (_req, res) => res.sendFile(path.join(FRONTEND_DIST, "admin.html")));

// Catch-all: serve index.html for all other non-API routes
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(FRONTEND_DIST, "index.html")));

// ── Global Error Handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────
async function startServer() {
  try {
    const connectDB = require("./db");
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Help Rehab Clinic API  → http://localhost:${PORT}`);
      console.log(`   Admin panel            → http://localhost:${PORT}/admin`);
      console.log(`   Health check           → http://localhost:${PORT}/api/health`);
    });

    // ── Start reminder scheduler ────────────────────────────
    const { startScheduler } = require("./utils/scheduler");
    startScheduler();
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    console.error("   Make sure MONGODB_URI is set in your .env file.");
    process.exit(1);
  }
}

startServer();
