const { Schema, model } = require("mongoose");

const ServiceSchema = new Schema(
  {
    name:        { type: String, required: true },
    slug:        { type: String, required: true, unique: true },
    description: { type: String },
    icon:        { type: String },
    is_active:   { type: Boolean, default: true },
    sort_order:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("Service", ServiceSchema);
