const { Schema, model } = require("mongoose");

const InquirySchema = new Schema(
  {
    name:        { type: String, required: true },
    email:       { type: String, required: true },
    phone:       { type: String },
    service_id:  { type: Schema.Types.ObjectId, ref: "Service" },
    message:     { type: String, required: true },
    status:      { type: String, enum: ["new", "in_progress", "resolved", "spam"], default: "new" },
    assigned_to: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    ip_address:  { type: String },
  },
  { timestamps: true }
);

module.exports = model("Inquiry", InquirySchema);
