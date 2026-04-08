const router      = require("express").Router();
const { body, validationResult } = require("express-validator");
const Appointment = require("../models/Appointment");
const { authenticate } = require("../middleware/auth");

// ── GET /api/appointments ─────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  const { status, doctor_id, date, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const filter = {};
    if (status)    filter.status    = status;
    if (doctor_id) filter.doctor_id = doctor_id;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.scheduled_at = { $gte: d, $lt: next };
    }

    const [total, data] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate("patient_id", "full_name phone")
        .populate("doctor_id",  "full_name")
        .populate("service_id", "name")
        .sort({ scheduled_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    const rows = data.map(a => ({
      ...a, id: a._id,
      patient_name:  a.patient_id?.full_name,
      patient_phone: a.patient_id?.phone,
      doctor_name:   a.doctor_id?.full_name,
      service_name:  a.service_id?.name,
    }));

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("List appointments error:", err.message);
    res.status(500).json({ error: "Failed to fetch appointments." });
  }
});

// ── GET /api/appointments/:id ─────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate("patient_id", "full_name phone email")
      .populate("doctor_id",  "full_name")
      .populate("service_id", "name")
      .populate("notes.authored_by", "username")
      .lean();
    if (!appt) return res.status(404).json({ error: "Appointment not found." });
    res.json({ ...appt, id: appt._id, patient_name: appt.patient_id?.full_name, doctor_name: appt.doctor_id?.full_name, service_name: appt.service_id?.name });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointment." });
  }
});

// ── POST /api/appointments ────────────────────────────────────
router.post(
  "/",
  authenticate,
  [
    body("scheduled_at").isISO8601().withMessage("Valid ISO datetime required."),
    body("duration_mins").optional().isInt({ min: 5, max: 480 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { patient_id, doctor_id, service_id, inquiry_id, scheduled_at, duration_mins = 45, reason } = req.body;

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

    try {
      const appt = await Appointment.create({
        patient_id:   patient_id   || undefined,
        doctor_id:    doctor_id    || undefined,
        service_id:   service_id   || undefined,
        inquiry_id:   inquiry_id   || undefined,
        scheduled_at,
        duration_mins,
        status:       "pending",
        reason:       reason       || undefined,
        created_by:   req.admin._id,
      });
      res.status(201).json(appt);
    } catch (err) {
      console.error("Create appointment error:", err.message);
      res.status(500).json({ error: "Failed to create appointment." });
    }
  }
);

// ── PATCH /api/appointments/:id ───────────────────────────────
router.patch("/:id", authenticate, async (req, res) => {
  const { status, scheduled_at, duration_mins, reason, doctor_id } = req.body;
  try {
    const update = {};
    if (status)        update.status        = status;
    if (scheduled_at)  update.scheduled_at  = scheduled_at;
    if (duration_mins) update.duration_mins = duration_mins;
    if (reason)        update.reason        = reason;
    if (doctor_id)     update.doctor_id     = doctor_id;

    // ── Double-booking check on reschedule ────────────────────
    if ((scheduled_at || doctor_id) && (update.doctor_id || doctor_id)) {
      const existing = await Appointment.findById(req.params.id).lean();
      if (existing) {
        const targetDoctorId = update.doctor_id || existing.doctor_id?.toString();
        const targetTime     = update.scheduled_at ? new Date(update.scheduled_at) : existing.scheduled_at;
        const mins           = update.duration_mins || existing.duration_mins || 45;
        const slotStart      = new Date(targetTime.getTime() - mins * 60 * 1000);
        const slotEnd        = new Date(targetTime.getTime() + mins * 60 * 1000);

        const conflict = await Appointment.findOne({
          _id:          { $ne: req.params.id },
          doctor_id:    targetDoctorId,
          status:       { $nin: ["cancelled", "no_show"] },
          scheduled_at: { $gte: slotStart, $lte: slotEnd },
        });
        if (conflict) {
          return res.status(409).json({ error: "Doctor already has an appointment at this time slot." });
        }
      }
    }

    const appt = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!appt) return res.status(404).json({ error: "Appointment not found." });
    res.json({ ...appt, id: appt._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to update appointment." });
  }
});

// ── DELETE /api/appointments/:id ──────────────────────────────
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const result = await Appointment.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Appointment not found." });
    res.json({ message: "Appointment deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete appointment." });
  }
});

// ── POST /api/appointments/:id/notes ─────────────────────────
router.post("/:id/notes", authenticate, async (req, res) => {
  const { content, note_type = "general" } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Note content required." });
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: "Appointment not found." });

    appt.notes.push({ authored_by: req.admin._id, note_type, content });
    await appt.save();
    res.status(201).json(appt.notes[appt.notes.length - 1]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add note." });
  }
});

module.exports = router;
