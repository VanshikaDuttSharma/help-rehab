/**
 * Appointment reminder scheduler
 * Runs every hour, finds appointments 23–25 hrs away with status confirmed/scheduled,
 * sends a reminder email if patient has an email address.
 */

const cron        = require("node-cron");
const Appointment = require("../models/Appointment");
const Patient     = require("../models/Patient");
const { sendMail, appointmentReminderEmail } = require("./email");

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function sendReminders() {
  try {
    const now  = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hrs from now
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hrs from now

    const appointments = await Appointment.find({
      scheduled_at: { $gte: from, $lte: to },
      status: { $in: ["scheduled", "confirmed"] },
    })
      .populate("patient_id", "full_name email")
      .populate("doctor_id",  "full_name")
      .populate("service_id", "name")
      .lean();

    for (const appt of appointments) {
      const patient = appt.patient_id;
      if (!patient?.email) continue;

      const tpl = appointmentReminderEmail({
        patientName: patient.full_name,
        date:        formatDate(appt.scheduled_at),
        time:        formatTime(appt.scheduled_at),
        doctorName:  appt.doctor_id?.full_name  || null,
        serviceName: appt.service_id?.name || null,
      });

      await sendMail({ to: patient.email, ...tpl });
    }

    if (appointments.length > 0) {
      console.log(`[scheduler] Sent ${appointments.length} reminder(s)`);
    }
  } catch (err) {
    console.error("[scheduler] Reminder error:", err.message);
  }
}

function startScheduler() {
  // Run every hour at :00
  cron.schedule("0 * * * *", sendReminders);
  console.log("[scheduler] 24-hour appointment reminder scheduler started.");
}

module.exports = { startScheduler };
