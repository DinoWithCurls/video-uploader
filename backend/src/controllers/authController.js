import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId) => {
  console.log('[AuthController.generateToken] Generating token for user:', userId);
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
  console.log('[AuthController.generateToken] Token generated successfully');
  return token;
};

export const register = async (req, res) => {
  try {
    console.log('[AuthController.register] Entry:', { email: req.body.email, name: req.body.name });
    const { name, email, password } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('[AuthController.register] Email already exists:', email);
      return res.status(400).json({ message: "Email already in use!" });
    }

    const user = await User.create({ name, email, password });
    console.log('[AuthController.register] User created:', { id: user._id, email: user.email, role: user.role });
    
    const token = generateToken(user._id);
    console.log('[AuthController.register] Success: User registered');
    
    return res.status(201).json({
      message: "User created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error('[AuthController.register] Error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    console.log('[AuthController.login] Entry:', { email: req.body.email });
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      console.log('[AuthController.login] User not found:', email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('[AuthController.login] Invalid password for:', email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);
    console.log('[AuthController.login] Success:', { userId: user._id, email: user.email, role: user.role });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error('[AuthController.login] Error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    console.log('[AuthController.getCurrentUser] Entry:', { userId: req.user.id });
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('[AuthController.getCurrentUser] User not found:', req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('[AuthController.getCurrentUser] Success:', { userId: user._id, email: user.email });
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[AuthController.getCurrentUser] Error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  console.log('[AuthController.logout] User logging out');
  res.clearCookie("token");
  console.log('[AuthController.logout] Success: Cookie cleared');
  res.status(200).json({ message: "Logged out successfully" });
};

