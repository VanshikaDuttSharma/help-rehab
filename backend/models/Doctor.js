const { Schema, model } = require("mongoose");

const DoctorSchema = new Schema(
  {
    full_name:   { type: String, required: true },
    designation: { type: String },
    specialty:   { type: String },
    bio:         { type: String },
    photo_url:   { type: String },
    email:       { type: String },
    phone:       { type: String },
    is_active:   { type: Boolean, default: true },
    sort_order:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("Doctor", DoctorSchema);
