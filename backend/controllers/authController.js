import bcrypt from 'bcryptjs';
import { User, Tenant } from '../models/index.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { setAuthCookies, clearAuthCookies, getMockUserWithTokens } from '../utils/mockAuth.js';
import mongoose from 'mongoose';

// Mock users for development/testing - always available
const mockUsers = {
  'admin@acme.test': {
    _id: 'mock-admin-acme',
    email: 'admin@acme.test',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: { _id: 'mock-tenant-acme', slug: 'acme', name: 'Acme Corporation', plan: 'free', noteLimit: 3, isActive: true, canCreateNotes: true, usage: { currentNoteCount: 0 } },
    role: 'admin',
    fullName: 'Admin User',
    isActive: true,
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    }
  },
  'user@acme.test': {
    _id: 'mock-user-acme',
    email: 'user@acme.test',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: { _id: 'mock-tenant-acme', slug: 'acme', name: 'Acme Corporation', plan: 'free', noteLimit: 3, isActive: true, canCreateNotes: true, usage: { currentNoteCount: 0 } },
    role: 'member',
    fullName: 'Regular User',
    isActive: true,
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    }
  },
  'admin@globex.test': {
    _id: 'mock-admin-globex',
    email: 'admin@globex.test',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: { _id: 'mock-tenant-globex', slug: 'globex', name: 'Globex Corporation', plan: 'pro', noteLimit: -1, isActive: true, canCreateNotes: true, usage: { currentNoteCount: 0 } },
    role: 'admin',
    fullName: 'Globex Admin',
    isActive: true,
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    }
  },
  'user@globex.test': {
    _id: 'mock-user-globex',
    email: 'user@globex.test',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: { _id: 'mock-tenant-globex', slug: 'globex', name: 'Globex Corporation', plan: 'pro', noteLimit: -1, isActive: true, canCreateNotes: true, usage: { currentNoteCount: 0 } },
    role: 'member',
    fullName: 'Globex Member',
    isActive: true,
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    }
  }
};

/**
 * User login - supports both mock accounts and database authentication
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();
    
    let user;
    let isMockUser = false;
    
    // First check mock users (always available)
    if (mockUsers[lowerEmail]) {
      const isPasswordValid = await bcrypt.compare(password, mockUsers[lowerEmail].password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      user = mockUsers[lowerEmail];
      isMockUser = true;
    } 
    // Then check database if connected and no mock user found
    else if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ 
        email: lowerEmail,
        isActive: true 
      });
      
      if (user) {
        // Manually fetch tenant data since tenantId is now a string
        const tenant = await Tenant.findOne({ slug: user.tenantId });
        if (tenant) {
          // Create a user object compatible with mock users structure
          user = {
            ...user.toObject(),
            tenantId: {
              _id: user.tenantId, // Keep the string ID for Note model compatibility
              slug: tenant.slug,
              name: tenant.name,
              plan: tenant.plan,
              noteLimit: tenant.noteLimit,
              isActive: tenant.isActive,
              usage: tenant.usage
            }
          };
        }
      }
      
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Check if user account is locked (only for database users)
      if (user.isLocked) {
        return res.status(423).json({
          error: 'Account is temporarily locked due to too many failed login attempts',
          code: 'ACCOUNT_LOCKED',
          lockUntil: user.security.lockUntil
        });
      }
      
      // Verify password for database users
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Reset login attempts on successful login
      await user.resetLoginAttempts();
    } else {
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

    // Set authentication cookies
    setAuthCookies(res, {
      tenantSlug: user.tenantId.slug,
      email: user.email,
      role: user.role
    }, accessToken, refreshToken);

    // Return user data and tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile || {},
        permissions: user.permissions,
        isAdmin: user.role === 'admin'
      },
      tenant: {
        id: user.tenantId._id,
        slug: user.tenantId.slug,
        name: user.tenantId.name,
        plan: user.tenantId.plan,
        noteLimit: user.tenantId.noteLimit,
        hasUnlimitedNotes: user.tenantId.noteLimit === -1,
        remainingNotes: user.tenantId.noteLimit === -1 ? 'Unlimited' : user.tenantId.noteLimit,
        canCreateNotes: true,
        usage: user.tenantId.usage || { notes: 0 }
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
    const { userId, tenantId } = req.user;

    const user = await User.findById(userId)
      .select('-password');
      
    if (user) {
      // Manually fetch tenant data since tenantId is now a string
      const tenant = await Tenant.findOne({ slug: user.tenantId });
      if (tenant) {
        // Create a user object compatible with mock users structure
        user = {
          ...user.toObject(),
          tenantId: {
            _id: user.tenantId, // Keep the string ID for Note model compatibility
            slug: tenant.slug,
            name: tenant.name,
            plan: tenant.plan,
            noteLimit: tenant.noteLimit,
            isActive: tenant.isActive,
            usage: tenant.usage
          }
        };
      }
    }

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile,
        permissions: user.permissions,
        isAdmin: user.isAdmin,
        preferences: user.preferences,
        security: {
          lastLogin: user.security.lastLogin,
          emailVerified: user.security.emailVerified,
          twoFactorEnabled: user.security.twoFactorEnabled
        }
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
        usage: user.tenantId.usage,
        subscription: user.tenantId.subscription
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      code: 'GET_USER_ERROR'
    });
  }
};

/**
 * Logout user (optional - for token blacklisting)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // Clear authentication cookies
    clearAuthCookies(res);
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId)
      .populate('tenantId', 'slug name plan isActive noteLimit usage subscription');

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
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
    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
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
