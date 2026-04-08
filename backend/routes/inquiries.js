const router      = require("express").Router();
const { body, validationResult } = require("express-validator");
const Inquiry     = require("../models/Inquiry");
const Appointment = require("../models/Appointment");
const Patient     = require("../models/Patient");
const Service     = require("../models/Service");
const { authenticate, requireRole } = require("../middleware/auth");
const { sendMail, appointmentConfirmationEmail } = require("../utils/email");

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── GET /api/inquiries/test-email — Dev: test email sending ──
router.get("/test-email", authenticate, async (req, res) => {
  const { sendMail, appointmentConfirmationEmail } = require("../utils/email");
  const tpl = appointmentConfirmationEmail({
    patientName: "Test Patient",
    date:        "Monday, 10 April 2026",
    time:        "10:00 AM",
    doctorName:  "Dr. Test",
    serviceName: "Physiotherapy",
  });
  const result = await sendMail({ to: req.query.to || "test@example.com", ...tpl });
  res.json({ sent: result, to: req.query.to || "test@example.com", hint: "Check server console for Ethereal preview URL if no real SMTP is configured." });
});

// ── POST /api/inquiries — Public contact form submission ──────
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required."),
    body("phone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^(\+91[\s-]?)?[6-9]\d{9}$/)
      .withMessage("Invalid phone number. Must be 10 digits starting with 6–9."),
    body("service").optional().trim(),
    body("message").trim().isLength({ min: 10 }).withMessage("Message must be at least 10 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, service, message } = req.body;
    try {
      let serviceDoc = null;
      if (service) {
        serviceDoc = await Service.findOne({ $or: [{ slug: service }, { name: new RegExp(service, "i") }] });
      }

      const inquiry = await Inquiry.create({
        name,
        email,
        phone:      phone || undefined,
        service_id: serviceDoc?._id || undefined,
        message,
        ip_address: req.ip,
      });

      return res.status(201).json({
        message:   "Inquiry submitted successfully. We'll contact you within 24 hours.",
        inquiryId: inquiry._id,
      });
    } catch (err) {
      console.error("Inquiry submit error:", err.message);
      return res.status(500).json({ error: "Failed to submit inquiry." });
    }
  }
);

// ── GET /api/inquiries — Admin: list with filters & pagination ─
router.get("/", authenticate, async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }

    const [total, data] = await Promise.all([
      Inquiry.countDocuments(filter),
      Inquiry.find(filter)
        .populate("service_id", "name")
        .populate("assigned_to", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    const rows = data.map(i => ({
      ...i,
      id:                i._id,
      service_name:      i.service_id?.name || null,
      assigned_username: i.assigned_to?.username || null,
      created_at:        i.createdAt,
    }));

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("List inquiries error:", err.message);
    res.status(500).json({ error: "Failed to fetch inquiries." });
  }
});

// ── GET /api/inquiries/:id ────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate("service_id", "name")
      .lean();
    if (!inquiry) return res.status(404).json({ error: "Inquiry not found." });
    res.json({ ...inquiry, id: inquiry._id, service_name: inquiry.service_id?.name, created_at: inquiry.createdAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inquiry." });
  }
});

// ── POST /api/inquiries/:id/accept — Accept enquiry → create appointment + send email ──
router.post("/:id/accept", authenticate, async (req, res) => {
  const { scheduled_at, doctor_id, duration_mins = 45 } = req.body;

  if (!scheduled_at) {
    return res.status(400).json({ error: "scheduled_at (ISO datetime) is required to accept an inquiry." });
  }

  try {
    const inquiry = await Inquiry.findById(req.params.id).populate("service_id", "name").lean();
    if (!inquiry) return res.status(404).json({ error: "Inquiry not found." });

    if (inquiry.status === "resolved") {
      return res.status(400).json({ error: "Inquiry is already resolved/accepted." });
    }

    // ── Double-booking check ──────────────────────────────────
    if (doctor_id) {
      const apptTime  = new Date(scheduled_at);
      const slotStart = new Date(apptTime.getTime() - duration_mins * 60 * 1000);
      const slotEnd   = new Date(apptTime.getTime() + duration_mins * 60 * 1000);

      const conflict = await Appointment.findOne({
        doctor_id,
        status:       { $nin: ["cancelled", "no_show"] },
        scheduled_at: { $gte: slotStart, $lte: slotEnd },
      });
      if (conflict) {
        return res.status(409).json({ error: "Doctor already has an appointment at this time slot. Please choose a different time." });
      }
    }

    // ── Find or create patient from inquiry ───────────────────
    let patient = await Patient.findOne({ email: inquiry.email });
    if (!patient) {
      patient = await Patient.create({
        full_name: inquiry.name,
        email:     inquiry.email,
        phone:     inquiry.phone || undefined,
      });
    }

    // ── Create appointment ────────────────────────────────────
    const appointment = await Appointment.create({
      patient_id:   patient._id,
      doctor_id:    doctor_id    || undefined,
      service_id:   inquiry.service_id?._id || undefined,
      inquiry_id:   inquiry._id,
      scheduled_at,
      duration_mins,
      status:       "confirmed",
      reason:       inquiry.message,
      created_by:   req.admin._id,
    });

    // ── Update inquiry status → resolved ─────────────────────
    await Inquiry.findByIdAndUpdate(req.params.id, { status: "resolved" });

    // ── Populate appointment for response ─────────────────────
    const populated = await Appointment.findById(appointment._id)
      .populate("patient_id", "full_name email")
      .populate("doctor_id",  "full_name")
      .populate("service_id", "name")
      .lean();

    // ── Send confirmation email ───────────────────────────────
    console.log("[accept] Sending confirmation email to:", patient.email);
    const tpl = appointmentConfirmationEmail({
      patientName: patient.full_name,
      date:        formatDate(scheduled_at),
      time:        formatTime(scheduled_at),
      doctorName:  populated.doctor_id?.full_name  || null,
      serviceName: populated.service_id?.name || null,
    });
    console.log("[accept] Email template built, calling sendMail...");
    const emailSent = await sendMail({ to: patient.email, ...tpl });
    console.log("[accept] sendMail result:", emailSent);

    return res.status(201).json({
      message:     "Inquiry accepted. Appointment created and confirmation email sent.",
      appointment: { ...populated, id: populated._id },
      patient:     { id: patient._id, full_name: patient.full_name, email: patient.email },
    });
  } catch (err) {
    console.error("Accept inquiry error:", err.message);
    return res.status(500).json({ error: "Failed to accept inquiry." });
  }
});

// ── PATCH /api/inquiries/:id ──────────────────────────────────
router.patch("/:id", authenticate, async (req, res) => {
  const { status, assigned_to } = req.body;
  try {
    const update = {};
    if (status)      update.status      = status;
    if (assigned_to) update.assigned_to = assigned_to;

    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("service_id", "name").lean();
    if (!inquiry) return res.status(404).json({ error: "Inquiry not found." });
    res.json({ ...inquiry, id: inquiry._id, service_name: inquiry.service_id?.name });
  } catch (err) {
    res.status(500).json({ error: "Failed to update inquiry." });
  }
});

// ── DELETE /api/inquiries/:id ─────────────────────────────────
router.delete("/:id", authenticate, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ message: "Inquiry deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete inquiry." });
  }
});

module.exports = router;
