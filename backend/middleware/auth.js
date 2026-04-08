const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

/**
 * Verify JWT Bearer token and attach admin user to req.admin
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  try {
    const user = await AdminUser.findById(payload.sub).select("-password_hash");
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Account not found or deactivated." });
    }




















































    req.admin = user;
    next();
  } catch (err) {
    console.error("Auth DB error:", err.message);
    return res.status(500).json({ error: "Authentication error." });
  }
}

/**
 * Role-based access guard — usage: requireRole("admin", "superadmin")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: "Not authenticated." });
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
