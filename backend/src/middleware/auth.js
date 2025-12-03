import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    console.log('[AuthMiddleware.auth] Entry:', { path: req.path, method: req.method });
    // Extract token from Authorization header or query parameter
    // Query parameter is needed for video streaming since <video> elements can't set headers
    let token = req.headers.authorization?.split(" ")[1];
    
    if (!token && req.query.token) {
      console.log('[AuthMiddleware.auth] Token from query parameter');
      token = req.query.token;
    }

    if (!token) {
      console.log('[AuthMiddleware.auth] No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log('[AuthMiddleware.auth] User not found:', decoded.id);
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user info to request with organizationId from JWT
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      organizationId: decoded.organizationId || user.organizationId,
    };
    console.log('[AuthMiddleware.auth] Success:', { userId: req.user.id, role: req.user.role, orgId: req.user.organizationId });

    next();
  } catch (err) {
    console.error('[AuthMiddleware.auth] Error:', err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
