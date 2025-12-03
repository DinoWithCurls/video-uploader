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

    req.user = user; // attach user to request
    console.log('[AuthMiddleware.auth] Success:', { userId: user._id, role: user.role });

    next();
  } catch (err) {
    console.error('[AuthMiddleware.auth] Error:', err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
