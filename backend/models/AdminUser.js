const { Schema, model } = require("mongoose");

const AdminUserSchema = new Schema(
  {
    username:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    email:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    password_hash: { type: String, required: true },
    role:          { type: String, enum: ["superadmin", "admin", "staff"], default: "staff" },
    is_active:     { type: Boolean, default: true },
    last_login:    { type: Date },
  },
  { timestamps: true }
);

module.exports = model("AdminUser", AdminUserSchema);
