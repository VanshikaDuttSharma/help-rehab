const router    = require("express").Router();
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const AdminUser = require("../models/AdminUser");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

// ── POST /api/auth/login ──────────────────────────────────────
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username required."),
    body("password").notEmpty().withMessage("Password required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
      const user = await AdminUser.findOne({
        $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
        is_active: true,
      });

      if (!user) return res.status(401).json({ error: "Invalid credentials." });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials." });

      user.last_login = new Date();
      await user.save();

      const token = jwt.sign(
        { sub: user._id, role: user.role, username: user.username },
        JWT_SECRET,
        { expiresIn: "12h" }
      );

      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({ error: "Login failed." });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.admin });
});

// ── POST /api/auth/change-password ───────────────────────────
router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty().withMessage("Current password required."),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const user = await AdminUser.findById(req.admin._id);
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(400).json({ error: "Current password incorrect." });

      user.password_hash = await bcrypt.hash(newPassword, 12);
      await user.save();
      res.json({ message: "Password updated successfully." });
    } catch (err) {
      console.error("Change password error:", err.message);
      res.status(500).json({ error: "Failed to change password." });
    }
  }
);

module.exports = router;
