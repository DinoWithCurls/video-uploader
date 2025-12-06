import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

const generateToken = (userId, organizationId) => {
  console.log('[AuthController.generateToken] Generating token for user:', userId, 'org:', organizationId);
  const token = jwt.sign(
    { 
      id: userId,
      organizationId: organizationId 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  console.log('[AuthController.generateToken] Token generated successfully');
  return token;
};

// List of common public email domains to exclude from auto-joining
const PUBLIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 
  'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
];

const extractDomain = (email) => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
};

/**
 * Register a new user and optionally create an organization
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  let organization; // Declare organization here to be accessible in catch block
  let role = 'admin'; // Default role for new organization creators

  try {
    console.log('[AuthController.register] Entry:', { email: req.body.email, name: req.body.name });
    const { name, email, password, organizationName } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('[AuthController.register] Email already exists:', email);
      return res.status(400).json({ message: "Email already in use!" });
    }

    const domain = extractDomain(email);
    const isPublicDomain = domain && PUBLIC_DOMAINS.includes(domain);

    // Check if we should auto-join an existing organization based on domain
    if (domain && !isPublicDomain) {
      console.log('[AuthController.register] Checking for organization with domain:', domain);
      // Find organization that has this domain in allowedDomains
      organization = await Organization.findOne({ 
        'settings.allowedDomains': domain 
      });
      
      if (organization) {
        role = 'editor'; // Default role for joining users
        console.log('[AuthController.register] Auto-joining existing organization:', { id: organization._id, name: organization.name });
      }
    }

    // If no organization found to join, create a new one
    if (!organization) {
      const orgName = organizationName || `${name}'s Organization`;
      const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Ensure unique slug
      let uniqueSlug = orgSlug;
      let counter = 1;
      while (await Organization.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${orgSlug}-${counter}`;
        counter++;
      }
      
      console.log('[AuthController.register] Creating organization:', { name: orgName, slug: uniqueSlug });
      
      organization = await Organization.create({
        name: orgName,
        slug: uniqueSlug,
        owner: null, // Will be updated after user creation
        plan: 'free',
        settings: {
          // Add domain to allowed list if it's not public
          allowedDomains: (domain && !isPublicDomain) ? [domain] : []
        }
      });
      
      console.log('[AuthController.register] Organization created:', { id: organization._id });
    }

    // Create user with organization
    const user = await User.create({ 
      name, 
      email, 
      password,
      organizationId: organization._id,
      role
    });
    
    // If new organization (role is admin), update owner
    if (role === 'admin') {
      organization.owner = user._id;
      await organization.save();
    }
    
    console.log('[AuthController.register] User created:', { id: user._id, email: user.email, role: user.role, orgId: organization._id });
    
    const token = generateToken(user._id, organization._id);
    console.log('[AuthController.register] Success: User registered');
    
    return res.status(201).json({
      message: "User created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id,
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
        },
      },
      token,
    });
  } catch (err) {
    console.error('[AuthController.register] Error:', err.message);
    // Only cleanup organization if we created it (admin role) and it failed
    if (role === 'admin' && organization && organization._id) {
      await Organization.findByIdAndDelete(organization._id).catch(e => console.error('Cleanup failed:', e));
    }
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Login user and return token
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    console.log('[AuthController.login] Entry:', { email: req.body.email });
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organizationId', 'name slug plan');
    if (!user) {
      console.log('[AuthController.login] User not found:', email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('[AuthController.login] Invalid password for:', email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const orgId = user.organizationId ? user.organizationId._id : undefined;
    const token = generateToken(user._id, orgId);
    console.log('[AuthController.login] Success:', { userId: user._id, email: user.email, role: user.role, orgId });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: orgId,
        organization: user.organizationId ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
          slug: user.organizationId.slug,
          plan: user.organizationId.plan,
        } : null,
      },
      token,
    });
  } catch (err) {
    console.error('[AuthController.login] Error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    console.log('[AuthController.getCurrentUser] Entry:', { userId: req.user.id });
    const user = await User.findById(req.user.id).select('-password').populate('organizationId', 'name slug plan');
    
    if (!user) {
      console.log('[AuthController.getCurrentUser] User not found:', req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('[AuthController.getCurrentUser] Success:', { userId: user._id, email: user.email, orgId: user.organizationId?._id });
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?._id,
        organization: user.organizationId ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
          slug: user.organizationId.slug,
          plan: user.organizationId.plan,
        } : null,
      },
    });
  } catch (err) {
    console.error('[AuthController.getCurrentUser] Error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Logout user (clear cookie)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  console.log('[AuthController.logout] User logging out');
  res.clearCookie("token");
  console.log('[AuthController.logout] Success: Cookie cleared');
  res.status(200).json({ message: "Logged out successfully" });
};

