const express     = require("express");
const bcrypt      = require("bcryptjs");
const Patient     = require("../models/Patient");
const Doctor      = require("../models/Doctor");
const Service     = require("../models/Service");
const Inquiry     = require("../models/Inquiry");
const Appointment = require("../models/Appointment");
const AdminUser   = require("../models/AdminUser");
const { authenticate, requireRole } = require("../middleware/auth");

// ============================================================
// PATIENTS
// ============================================================
const patientsRouter = express.Router();

patientsRouter.get("/", authenticate, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  try {
    const filter = search
      ? { $or: [{ full_name: new RegExp(search,"i") }, { phone: new RegExp(search,"i") }, { email: new RegExp(search,"i") }] }
      : {};
    const [total, data] = await Promise.all([
      Patient.countDocuments(filter),
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    ]);
    res.json({ data: data.map(p => ({ ...p, id: p._id })), total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ error: "Failed to fetch patients." }); }
});

patientsRouter.get("/:id", authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return res.status(404).json({ error: "Patient not found." });
    const appointments = await Appointment.find({ patient_id: req.params.id })
      .populate("doctor_id", "full_name")
      .populate("service_id", "name")
      .sort({ scheduled_at: -1 })
      .lean();
    res.json({ ...patient, id: patient._id, appointments });
  } catch (err) { res.status(500).json({ error: "Failed to fetch patient." }); }
});

patientsRouter.post("/", authenticate, async (req, res) => {
  const { full_name, email, phone, date_of_birth, gender, address, city, notes } = req.body;
  if (!full_name || !phone) return res.status(400).json({ error: "Name and phone are required." });
  try {
    const patient = await Patient.create({ full_name, email, phone, date_of_birth, gender, address, city, notes });
    res.status(201).json(patient);
  } catch (err) { res.status(500).json({ error: "Failed to create patient." }); }
});

patientsRouter.patch("/:id", authenticate, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!patient) return res.status(404).json({ error: "Patient not found." });
    res.json({ ...patient, id: patient._id });
  } catch (err) { res.status(500).json({ error: "Failed to update patient." }); }
});

// ============================================================
// DOCTORS
// ============================================================
const doctorsRouter = express.Router();

doctorsRouter.get("/", async (_req, res) => {
  try {
    const doctors = await Doctor.find({ is_active: true }).sort({ sort_order: 1 }).lean();
    res.json(doctors.map(d => ({ ...d, id: d._id })));
  } catch (err) { res.status(500).json({ error: "Failed to fetch doctors." }); }
});

doctorsRouter.post("/", authenticate, requireRole("admin","superadmin"), async (req, res) => {
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ error: "Doctor name is required." });
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) { res.status(500).json({ error: "Failed to create doctor." }); }
});

doctorsRouter.patch("/:id", authenticate, requireRole("admin","superadmin"), async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!doctor) return res.status(404).json({ error: "Doctor not found." });
    res.json({ ...doctor, id: doctor._id });
  } catch (err) { res.status(500).json({ error: "Failed to update doctor." }); }
});

// ============================================================
// SERVICES (public GET)
// ============================================================
const servicesRouter = express.Router();

servicesRouter.get("/", async (_req, res) => {
  try {
    const services = await Service.find({ is_active: true }).sort({ sort_order: 1 }).lean();
    res.json(services.map(s => ({ ...s, id: s._id })));
  } catch (err) { res.status(500).json({ error: "Failed to fetch services." }); }
});

// ============================================================
// DASHBOARD STATS
// ============================================================
const dashboardRouter = express.Router();

dashboardRouter.get("/stats", authenticate, async (_req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingFilter = {
      scheduled_at: { $gte: now },
      status: { $in: ["pending", "scheduled", "confirmed"] },
    };

    const [inqTotal, inqNew, apptToday, upcomingCount, patientCount, recentInquiries, upcomingAppts, inqByStatus] = await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: "new" }),
      Appointment.countDocuments({ scheduled_at: { $gte: today, $lt: tomorrow }, status: { $nin: ["cancelled", "no_show"] } }),
      Appointment.countDocuments(upcomingFilter),
      Patient.countDocuments(),
      Inquiry.find().populate("service_id","name").sort({ createdAt: -1 }).limit(5).lean(),
      Appointment.find(upcomingFilter)
        .populate("patient_id","full_name")
        .populate("doctor_id","full_name")
        .populate("service_id","name")
        .sort({ scheduled_at: 1 })
        .limit(5)
        .lean(),
      Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    res.json({
      inquiries:    { total: inqTotal, new: inqNew },
      appointments: { today: apptToday, upcoming: upcomingCount },
      patients:     patientCount,
      recentInquiries: recentInquiries.map(i => ({ name:i.name, email:i.email, status:i.status, created_at:i.createdAt, service:i.service_id?.name })),
      upcomingAppointments: upcomingAppts.map(a => ({ scheduled_at:a.scheduled_at, status:a.status, patient:a.patient_id?.full_name, doctor:a.doctor_id?.full_name, service:a.service_id?.name })),
      inquiriesByStatus: inqByStatus.map(r => ({ status: r._id, count: r.count })),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ============================================================
// ADMIN USERS (superadmin only)
// ============================================================
const adminsRouter = express.Router();

adminsRouter.get("/", authenticate, requireRole("superadmin"), async (_req, res) => {
  try {
    const admins = await AdminUser.find().select("-password_hash").sort({ createdAt: 1 }).lean();
    res.json(admins.map(a => ({ ...a, id: a._id })));
  } catch (err) { res.status(500).json({ error: "Failed to fetch admin users." }); }
});

adminsRouter.post("/", authenticate, requireRole("superadmin"), async (req, res) => {
  const { username, email, password, role = "staff" } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Username, email, and password are required." });
  try {
    const hash  = await bcrypt.hash(password, 12);
    const admin = await AdminUser.create({ username, email, password_hash: hash, role });
    res.status(201).json({ id: admin._id, username: admin.username, email: admin.email, role: admin.role });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Username or email already exists." });
    res.status(500).json({ error: "Failed to create admin user." });
  }
});

adminsRouter.patch("/:id", authenticate, requireRole("superadmin"), async (req, res) => {
  const { is_active, role } = req.body;
  try {
    const update = {};
    if (is_active != null) update.is_active = is_active;
    if (role)              update.role      = role;
    const admin = await AdminUser.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password_hash").lean();
    if (!admin) return res.status(404).json({ error: "Admin user not found." });
    res.json({ ...admin, id: admin._id });
  } catch (err) { res.status(500).json({ error: "Failed to update admin user." }); }
});

module.exports = { patientsRouter, doctorsRouter, servicesRouter, dashboardRouter, adminsRouter };
