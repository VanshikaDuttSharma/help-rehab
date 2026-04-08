const { Schema, model } = require("mongoose");

const PatientSchema = new Schema(
  {
    full_name:     { type: String, required: true },
    email:         { type: String },
    phone:         { type: String, required: true },
    date_of_birth: { type: Date },
    gender:        { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    address:       { type: String },
    city:          { type: String },
    notes:         { type: String },
  },
  { timestamps: true }
);

module.exports = model("Patient", PatientSchema);
