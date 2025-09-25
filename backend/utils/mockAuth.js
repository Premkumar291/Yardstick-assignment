import { generateToken, generateRefreshToken } from './jwt.js';

// Mock users data with pre-generated tokens
export const mockUsersWithTokens = {
  'admin@acme.test': {
    userId: 'mock-admin-acme',
    email: 'admin@acme.test',
    tenantId: 'mock-tenant-acme',
    tenantSlug: 'acme',
    role: 'admin',
    fullName: 'Admin User',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    },
    // Generate long-lived tokens (30 days)
    get accessToken() {
      return generateToken({
        userId: this.userId,
        email: this.email,
        tenantId: this.tenantId,
        tenantSlug: this.tenantSlug,
        role: this.role,
        permissions: this.permissions
      });
    },
    get refreshToken() {
      return generateRefreshToken({
        userId: this.userId,
        tenantId: this.tenantId
      });
    }
  },
  'user@acme.test': {
    userId: 'mock-user-acme',
    email: 'user@acme.test',
    tenantId: 'mock-tenant-acme',
    tenantSlug: 'acme',
    role: 'member',
    fullName: 'Regular User',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    },
    get accessToken() {
      return generateToken({
        userId: this.userId,
        email: this.email,
        tenantId: this.tenantId,
        tenantSlug: this.tenantSlug,
        role: this.role,
        permissions: this.permissions
      });
    },
    get refreshToken() {
      return generateRefreshToken({
        userId: this.userId,
        tenantId: this.tenantId
      });
    }
  },
  'admin@globex.test': {
    userId: 'mock-admin-globex',
    email: 'admin@globex.test',
    tenantId: 'mock-tenant-globex',
    tenantSlug: 'globex',
    role: 'admin',
    fullName: 'Globex Admin',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    },
    get accessToken() {
      return generateToken({
        userId: this.userId,
        email: this.email,
        tenantId: this.tenantId,
        tenantSlug: this.tenantSlug,
        role: this.role,
        permissions: this.permissions
      });
    },
    get refreshToken() {
      return generateRefreshToken({
        userId: this.userId,
        tenantId: this.tenantId
      });
    }
  },
  'user@globex.test': {
    userId: 'mock-user-globex',
    email: 'user@globex.test',
    tenantId: 'mock-tenant-globex',
    tenantSlug: 'globex',
    role: 'member',
    fullName: 'Globex Member',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    },
    get accessToken() {
      return generateToken({
        userId: this.userId,
        email: this.email,
        tenantId: this.tenantId,
        tenantSlug: this.tenantSlug,
        role: this.role,
        permissions: this.permissions
      });
    },
    get refreshToken() {
      return generateRefreshToken({
        userId: this.userId,
        tenantId: this.tenantId
      });
    }
  }
};

/**
 * Set authentication cookies for a user
 * @param {Object} res - Express response object
 * @param {Object} user - User object with tokens
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export const setAuthCookies = (res, user, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  const refreshCookieOptions = {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  // Set authentication cookies
  res.cookie('authToken', accessToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  res.cookie('tenantSlug', user.tenantSlug, { ...cookieOptions, httpOnly: false });
  res.cookie('userEmail', user.email, { ...cookieOptions, httpOnly: false });
  res.cookie('userRole', user.role, { ...cookieOptions, httpOnly: false });
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.clearCookie('authToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('tenantSlug', { ...cookieOptions, httpOnly: false });
  res.clearCookie('userEmail', { ...cookieOptions, httpOnly: false });
  res.clearCookie('userRole', { ...cookieOptions, httpOnly: false });
};

/**
 * Get mock user with fresh tokens
 * @param {string} email - User email
 * @returns {Object|null} User object with fresh tokens
 */
export const getMockUserWithTokens = (email) => {
  const user = mockUsersWithTokens[email.toLowerCase()];
  if (!user) return null;

  return {
    ...user,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken
  };
};

export default {
  mockUsersWithTokens,
  setAuthCookies,
  clearAuthCookies,
  getMockUserWithTokens
};
