import bcrypt from 'bcryptjs';
import { User, Tenant } from '../models/index.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (we'll need to check across tenants for login)
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    }).populate('tenantId', 'slug name plan isActive noteLimit usage subscription');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.security.lockUntil
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if tenant is active
    if (!user.tenantId || !user.tenantId.isActive) {
      return res.status(403).json({
        error: 'Organization account is inactive',
        code: 'TENANT_INACTIVE'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      tenantId: user.tenantId._id,
      tenantSlug: user.tenantId.slug,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data and tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile,
        permissions: user.permissions,
        isAdmin: user.isAdmin
      },
      tenant: {
        id: user.tenantId._id,
        slug: user.tenantId.slug,
        name: user.tenantId.name,
        plan: user.tenantId.plan,
        noteLimit: user.tenantId.noteLimit,
        hasUnlimitedNotes: user.tenantId.hasUnlimitedNotes,
        remainingNotes: user.tenantId.remainingNotes,
        canCreateNotes: user.tenantId.canCreateNotes,
        usage: user.tenantId.usage
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login service error',
      code: 'LOGIN_SERVICE_ERROR'
    });
  }
};

/**
 * User registration (creates new tenant and admin user)
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, tenantName, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase() 
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Generate tenant slug from name
    const tenantSlug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Check if tenant slug already exists
    const existingTenant = await Tenant.findOne({ slug: tenantSlug });

    if (existingTenant) {
      return res.status(409).json({
        error: 'Organization name already taken',
        code: 'TENANT_EXISTS'
      });
    }

    // Create tenant
    const tenant = new Tenant({
      slug: tenantSlug,
      name: tenantName,
      plan: 'free',
      noteLimit: 3,
      isActive: true
    });

    await tenant.save();

    // Create admin user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      tenantId: tenant._id,
      role: 'admin',
      profile: {
        firstName: firstName || '',
        lastName: lastName || ''
      },
      permissions: {
        canCreateNotes: true,
        canEditNotes: true,
        canDeleteNotes: true,
        canShareNotes: true,
        canManageUsers: true,
        canManageTenant: true
      },
      isActive: true
    });

    await user.save();

    // Update tenant user count
    await tenant.incrementUsage('users', 1);

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      tenantId: tenant._id,
      tenantSlug: tenant.slug,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data and tokens
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile,
        permissions: user.permissions,
        isAdmin: user.isAdmin
      },
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        noteLimit: tenant.noteLimit,
        hasUnlimitedNotes: tenant.hasUnlimitedNotes,
        remainingNotes: tenant.remainingNotes,
        canCreateNotes: tenant.canCreateNotes,
        usage: tenant.usage
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration service error',
      code: 'REGISTRATION_SERVICE_ERROR'
    });
  }
};

/**
 * Get current user information
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User and tenant are already loaded by auth middleware
    const user = req.user;
    const tenant = req.tenant;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile,
        permissions: user.permissions,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastLogin: user.security.lastLogin
      },
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        noteLimit: tenant.noteLimit,
        hasUnlimitedNotes: tenant.hasUnlimitedNotes,
        remainingNotes: tenant.remainingNotes,
        canCreateNotes: tenant.canCreateNotes,
        usage: tenant.usage,
        settings: tenant.settings,
        subscription: {
          status: tenant.subscription.status,
          startDate: tenant.subscription.startDate,
          endDate: tenant.subscription.endDate
        }
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'User service error',
      code: 'USER_SERVICE_ERROR'
    });
  }
};

/**
 * Logout user (optional - for token blacklisting)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you would blacklist the token
    // For now, we'll just return a success message
    
    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout service error',
      code: 'LOGOUT_SERVICE_ERROR'
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Ensure this is a refresh token
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Load user and tenant
    const user = await User.findById(decoded.userId)
      .populate('tenantId', 'slug name plan isActive noteLimit usage subscription')
      .select('-password');

    if (!user || !user.isActive || !user.tenantId || !user.tenantId.isActive) {
      return res.status(401).json({
        error: 'Invalid user or tenant',
        code: 'INVALID_USER_TENANT'
      });
    }

    // Generate new access token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      tenantId: user.tenantId._id,
      tenantSlug: user.tenantId.slug,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = generateToken(tokenPayload);

    res.json({
      accessToken,
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh service error',
      code: 'TOKEN_REFRESH_SERVICE_ERROR'
    });
  }
};

export default {
  login,
  register,
  getCurrentUser,
  logout,
  refreshToken
};
