/**
 * MongoDB Atlas Seed Script
 * Usage: npm run setup-db
 *
 * Creates: Services, Doctors, and a default SuperAdmin user.
 * Safe to re-run — uses upsert, won't create duplicates.
 */

// Try both .env paths (run from root or from backend/scripts/)
require("dotenv").config();
if (!process.env.MONGODB_URI) require("dotenv").config({ path: "../../.env" });

const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const Service   = require("../models/Service");
const Doctor    = require("../models/Doctor");
const AdminUser = require("../models/AdminUser");

const SERVICES = [
  { name: "Physiotherapy",              slug: "physiotherapy",        description: "Restore movement and reduce pain through guided exercises and manual techniques.",        icon: "activity",  sort_order: 1 },
  { name: "Neurological Rehab",         slug: "neurological-rehab",   description: "Specialized therapy for stroke, spinal cord injury, and neurological conditions.",        icon: "brain",     sort_order: 2 },
  { name: "Psychiatry & Mental Health", slug: "psychiatry",           description: "Compassionate mental health care including diagnosis, therapy, and medication management.", icon: "heart",     sort_order: 3 },
  { name: "Speech Therapy",             slug: "speech-therapy",       description: "Improve communication skills and swallowing function for adults and children.",            icon: "mic",       sort_order: 4 },
  { name: "Occupational Therapy",       slug: "occupational-therapy", description: "Regain daily living skills and independence through task-focused rehabilitation.",          icon: "briefcase", sort_order: 5 },
  { name: "Post-Surgical Rehab",        slug: "post-surgical-rehab",  description: "Accelerate recovery after joint replacement, spine surgery, or other operations.",          icon: "scissors",  sort_order: 6 },
];

const DOCTORS = [
  { full_name: "Dr. Anil Sharma",      designation: "MBBS, MD (Psychiatry)",     specialty: "Psychiatry & Mental Health",  bio: "Senior psychiatrist with 15+ years experience in mood disorders, anxiety, and neuropsychiatry.", sort_order: 1 },
  { full_name: "Dr. Priya Kapoor",     designation: "BPT, MPT (Neuro)",          specialty: "Neurological Physiotherapy",  bio: "Expert in stroke rehabilitation, Parkinson's care, and spinal cord injury management.",           sort_order: 2 },
  { full_name: "Dr. Ravi Dogra",       designation: "BPT, MPT (Ortho), MIAP",   specialty: "Orthopedic Physiotherapy",    bio: "Specializes in sports injuries, post-surgical rehab, and chronic pain management.",                sort_order: 3 },
  { full_name: "Ms. Sunita Choudhary", designation: "M.Sc. Speech & Hearing",   specialty: "Speech & Language Therapy",   bio: "Certified SLP with expertise in aphasia, swallowing disorders, and voice therapy.",                 sort_order: 4 },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI not found. Copy .env.example → .env and fill in your Atlas connection string.");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB Atlas…");
  await mongoose.connect(uri);
  console.log("✅ Connected.\n");

  // ── Services ───────────────────────────────────────────────
  console.log("📦 Seeding services…");
  for (const s of SERVICES) {
    await Service.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
    console.log(`   ✓ ${s.name}`);
  }

  // ── Doctors ────────────────────────────────────────────────
  console.log("\n👩‍⚕️  Seeding doctors…");
  for (const d of DOCTORS) {
    await Doctor.findOneAndUpdate({ full_name: d.full_name }, d, { upsert: true, new: true });
    console.log(`   ✓ ${d.full_name}`);
  }

  // ── Default SuperAdmin ─────────────────────────────────────
  console.log("\n🔑 Seeding admin user…");
  const username = "admin";
  const email    = process.env.ADMIN_EMAIL    || "admin@helprehabclinic.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@1234";
  const hash     = await bcrypt.hash(password, 12);

  const existing = await AdminUser.findOne({ username });
  if (existing) {
    console.log(`   ℹ️  Admin user '${username}' already exists — skipping.`);
  } else {
    await AdminUser.create({ username, email, password_hash: hash, role: "superadmin" });
    console.log(`   ✓ Created admin: ${username} / ${password}`);
  }

  console.log("\n🎉 Seed complete! Run 'npm run dev' to start the server.");
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
