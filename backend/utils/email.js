/**
 * Email utility — nodemailer transporter + template helpers
 * Configure SMTP via .env:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 */

const nodemailer = require("nodemailer");

const CLINIC_NAME = process.env.CLINIC_NAME || "Help Rehab Clinic";
const FROM        = process.env.EMAIL_FROM  || `"${CLINIC_NAME}" <noreply@helprehabclinic.com>`;

// Build transporter — uses real SMTP if configured, otherwise Ethereal test account
let _transporter = null;
async function getTransporter() {
  if (_transporter) return _transporter;

  const hasRealConfig = process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes("example.com") &&
    process.env.EMAIL_PASS !== "your_brevo_smtp_key_here";

  console.log("[email] hasRealConfig:", hasRealConfig, "| EMAIL_USER:", process.env.EMAIL_USER || "NOT SET");

  if (hasRealConfig) {
    _transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp-relay.brevo.com",
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
    console.log("[email] Using real SMTP:", process.env.EMAIL_HOST);
  } else {
    // Auto-create a free Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("[email] No real SMTP configured — using Ethereal test account:", testAccount.user);
  }

  return _transporter;
}

/**
 * Send an email. Returns true on success, false on failure (logs error).
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text, replyTo: process.env.EMAIL_USER || FROM });
    console.log(`[email] Sent "${subject}" → ${to}`);
    // If using Ethereal, log the preview URL so you can view the email in browser
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[email] 👁  Preview URL: ${previewUrl}`);
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err.message);
    return false;
  }
}

// ── Shared HTML wrapper ────────────────────────────────────────
function wrap(body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .container{max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:#0d9488;padding:24px 32px;color:#fff}
  .header h1{margin:0;font-size:1.2rem}
  .body{padding:28px 32px;color:#333;line-height:1.6}
  .detail-box{background:#f0fdfa;border-left:4px solid #0d9488;border-radius:4px;padding:16px 20px;margin:20px 0}
  .detail-box p{margin:6px 0;font-size:.95rem}
  .detail-box strong{color:#0d9488}
  .footer{background:#f9f9f9;padding:16px 32px;font-size:.8rem;color:#888;border-top:1px solid #eee}
</style></head><body>
<div class="container">
  <div class="header"><h1>${CLINIC_NAME}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">This is an automated message from ${CLINIC_NAME}. Please do not reply to this email.</div>
</div></body></html>`;
}

// ── Template: Appointment Confirmation ────────────────────────
function appointmentConfirmationEmail({ patientName, date, time, doctorName, serviceName }) {
  const subject = `Appointment Confirmed – ${CLINIC_NAME}`;
  const html = wrap(`
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your enquiry has been accepted and your appointment has been successfully booked.</p>
    <div class="detail-box">
      <p><strong>Status:</strong> Appointment Confirmed ✓</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      ${doctorName ? `<p><strong>Doctor / Therapist:</strong> ${doctorName}</p>` : ""}
      ${serviceName ? `<p><strong>Service:</strong> ${serviceName}</p>` : ""}
    </div>
    <p>Please arrive 10 minutes before your scheduled time. If you need to reschedule or cancel, contact us as soon as possible.</p>
    <p>Thank you for choosing <strong>${CLINIC_NAME}</strong>.</p>
  `);
  const text = `Dear ${patientName},\n\nYour appointment has been confirmed.\n\nDate: ${date}\nTime: ${time}${doctorName ? `\nDoctor/Therapist: ${doctorName}` : ""}${serviceName ? `\nService: ${serviceName}` : ""}\n\nThank you,\n${CLINIC_NAME}`;
  return { subject, html, text };
}

// ── Template: Appointment Reminder (24 hrs before) ────────────
function appointmentReminderEmail({ patientName, date, time, doctorName, serviceName }) {
  const subject = `Appointment Reminder – Tomorrow at ${time} | ${CLINIC_NAME}`;
  const html = wrap(`
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>This is a friendly reminder that you have an appointment scheduled for <strong>tomorrow</strong>.</p>
    <div class="detail-box">
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      ${doctorName ? `<p><strong>Doctor / Therapist:</strong> ${doctorName}</p>` : ""}
      ${serviceName ? `<p><strong>Service:</strong> ${serviceName}</p>` : ""}
    </div>
    <p>Please arrive 10 minutes early. If you need to reschedule, contact us immediately.</p>
    <p>See you tomorrow — <strong>${CLINIC_NAME}</strong></p>
  `);
  const text = `Dear ${patientName},\n\nReminder: You have an appointment tomorrow.\n\nDate: ${date}\nTime: ${time}${doctorName ? `\nDoctor/Therapist: ${doctorName}` : ""}\n\nThank you,\n${CLINIC_NAME}`;
  return { subject, html, text };
}

module.exports = { sendMail, appointmentConfirmationEmail, appointmentReminderEmail, CLINIC_NAME };
