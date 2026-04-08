const { Schema, model } = require("mongoose");

const NoteSchema = new Schema(
  {
    authored_by: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    note_type:   { type: String, enum: ["general", "soap", "progress", "discharge"], default: "general" },
    content:     { type: String, required: true },
  },
  { timestamps: true }
);

const AppointmentSchema = new Schema(
  {
    patient_id:    { type: Schema.Types.ObjectId, ref: "Patient" },
    doctor_id:     { type: Schema.Types.ObjectId, ref: "Doctor" },
    service_id:    { type: Schema.Types.ObjectId, ref: "Service" },
    inquiry_id:    { type: Schema.Types.ObjectId, ref: "Inquiry" },
    scheduled_at:  { type: Date, required: true },
    duration_mins: { type: Number, default: 45 },
    status:        { type: String, enum: ["pending", "scheduled", "confirmed", "completed", "cancelled", "no_show"], default: "pending" },
    reason:        { type: String },
    created_by:    { type: Schema.Types.ObjectId, ref: "AdminUser" },
    notes:         [NoteSchema],
  },
  { timestamps: true }
);

module.exports = model("Appointment", AppointmentSchema);
