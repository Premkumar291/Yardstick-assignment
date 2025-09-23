import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate JWT token for user authentication
 * @param {Object} payload - User and tenant information
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
    role: payload.role,
    permissions: payload.permissions,
    tokenType: 'access'
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'notes-saas',
    audience: 'notes-saas-users'
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - User and tenant information
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (payload) => {
  const tokenPayload = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    tokenType: 'refresh',
    jti: crypto.randomUUID() // Unique token ID for revocation
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'notes-saas',
    audience: 'notes-saas-refresh'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'notes-saas',
      audience: ['notes-saas-users', 'notes-saas-refresh']
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Generate secure random token for password reset, etc.
 * @param {number} length - Token length in bytes
 * @returns {string} Random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token for storage (for password reset tokens, etc.)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validate token expiration
 * @param {number} exp - Token expiration timestamp
 * @returns {boolean} True if token is not expired
 */
export const isTokenExpired = (exp) => {
  return Date.now() >= exp * 1000;
};

/**
 * Get token expiration time in human readable format
 * @param {number} exp - Token expiration timestamp
 * @returns {string} Formatted expiration time
 */
export const getTokenExpirationTime = (exp) => {
  return new Date(exp * 1000).toISOString();
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateSecureToken,
  hashToken,
  isTokenExpired,
  getTokenExpirationTime
};
