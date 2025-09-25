import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { User, Tenant } from '../models/index.js';
import mongoose from 'mongoose';

// Mock users for development/testing - should match authController.js
const mockUsers = {
  'mock-admin-acme': {
    _id: 'mock-admin-acme',
    email: 'admin@acme.test',
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
  'mock-user-acme': {
    _id: 'mock-user-acme',
    email: 'user@acme.test',
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
  'mock-admin-globex': {
    _id: 'mock-admin-globex',
    email: 'admin@globex.test',
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
  'mock-user-globex': {
    _id: 'mock-user-globex',
    email: 'user@globex.test',
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
 * Authentication middleware - verifies JWT token and loads user/tenant context
 */
export const authenticate = async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware called for:', req.method, req.path);
    
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    let token = extractTokenFromHeader(authHeader);
    
    // If no token in header, check cookies
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('🍪 Token found in cookies');
    }
    
    console.log('🔑 Token extracted:', token ? 'Token present' : 'No token');

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('✅ Token verified for user:', decoded.userId);
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return res.status(401).json({
        error: 'Invalid or expired token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Ensure this is an access token
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type.',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if this is a mock user first
    let user;
    if (mockUsers[decoded.userId]) {
      user = mockUsers[decoded.userId];
      console.log('👤 Using mock user:', user.email);
    } else if (mongoose.connection.readyState === 1) {
      // Load user from database with tenant information
      user = await User.findById(decoded.userId)
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
      console.log('👤 Using database user:', user ? user.email : 'Not found');
    }

    if (!user) {
      console.log('❌ User not found for ID:', decoded.userId);
      return res.status(401).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'User account is deactivated.',
        code: 'USER_INACTIVE'
      });
    }

    // Check if tenant is active
    if (!user.tenantId || !user.tenantId.isActive) {
      return res.status(401).json({
        error: 'Tenant account is inactive.',
        code: 'TENANT_INACTIVE'
      });
    }

    // Verify tenant matches token (handle both mock and database users)
    const userTenantId = typeof user.tenantId._id === 'string' ? user.tenantId._id : user.tenantId._id.toString();
    if (userTenantId !== decoded.tenantId) {
      return res.status(401).json({
        error: 'Token tenant mismatch.',
        code: 'TENANT_MISMATCH'
      });
    }

    // Add user and tenant context to request
    req.user = user;
    req.tenant = user.tenantId;
    req.auth = {
      userId: user._id,
      tenantId: user.tenantId._id,
      tenantSlug: user.tenantId.slug,
      role: user.role,
      permissions: user.permissions,
      isAdmin: user.role === 'admin'
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication service error.',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Authorization middleware - checks if user has required role
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.auth.role
      });
    }

    next();
  };
};

/**
 * Permission middleware - checks specific permissions
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins have all permissions
    if (req.auth.isAdmin) {
      return next();
    }

    // Check specific permission
    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        error: `Permission '${permission}' required.`,
        code: 'PERMISSION_DENIED',
        required: permission
      });
    }

    next();
  };
};

/**
 * Tenant isolation middleware - ensures all operations are scoped to user's tenant
 */
export const ensureTenantIsolation = (req, res, next) => {
  if (!req.auth || !req.auth.tenantId) {
    return res.status(401).json({
      error: 'Tenant context required.',
      code: 'TENANT_CONTEXT_REQUIRED'
    });
  }

  // Add tenant filter helper to request
  req.addTenantFilter = (query = {}) => {
    return { ...query, tenantId: req.auth.tenantId };
  };

  // Add tenant data helper to request
  req.addTenantData = (data = {}) => {
    return { ...data, tenantId: req.auth.tenantId };
  };

  next();
};

/**
 * Optional authentication - loads user context if token is provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Try to authenticate
    await authenticate(req, res, (error) => {
      if (error) {
        // Authentication failed, continue without authentication
        return next();
      }
      // Authentication successful, continue with user context
      next();
    });
  } catch (error) {
    // Authentication error, continue without authentication
    next();
  }
};

/**
 * Admin only middleware - shorthand for admin role requirement
 */
export const adminOnly = [authenticate, authorize(['admin'])];

/**
 * Member or admin middleware - allows both roles
 */
export const memberOrAdmin = [authenticate, authorize(['admin', 'member'])];

/**
 * Authenticated user middleware - requires any authenticated user
 */
export const authenticated = [authenticate, ensureTenantIsolation];

export default {
  authenticate,
  authorize,
  requirePermission,
  ensureTenantIsolation,
  optionalAuth,
  adminOnly,
  memberOrAdmin,
  authenticated
};
