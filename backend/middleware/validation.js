import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  
  next();
};

/**
 * Authentication validation rules
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters with uppercase, lowercase, and number'),
  body('tenantName')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Organization name must be 2-100 characters'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Last name must be 1-50 characters'),
  handleValidationErrors
];

/**
 * Notes validation rules
 */
export const validateCreateNote = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title is required and must be 1-200 characters'),
  body('content')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content is required and must be 1-50,000 characters'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('Category must be less than 50 characters'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .trim()
    .withMessage('Each tag must be 1-30 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('visibility')
    .optional()
    .isIn(['private', 'shared', 'public'])
    .withMessage('Visibility must be private, shared, or public'),
  handleValidationErrors
];

export const validateUpdateNote = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title must be 1-200 characters'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be 1-50,000 characters'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('Category must be less than 50 characters'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .trim()
    .withMessage('Each tag must be 1-30 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  body('visibility')
    .optional()
    .isIn(['private', 'shared', 'public'])
    .withMessage('Visibility must be private, shared, or public'),
  handleValidationErrors
];

/**
 * Parameter validation rules
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),
  handleValidationErrors
];

export const validateTenantSlug = [
  param('slug')
    .matches(/^[a-z0-9-]+$/)
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant slug must be 2-50 characters with lowercase letters, numbers, and hyphens only'),
  handleValidationErrors
];

/**
 * Query parameter validation
 */
export const validateNotesQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title'])
    .withMessage('Sort by must be createdAt, updatedAt, or title'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  query('category')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('Category must be less than 50 characters'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Search query must be 1-100 characters'),
  handleValidationErrors
];

/**
 * User profile validation
 */
export const validateUserProfile = [
  body('profile.firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('First name must be 1-50 characters'),
  body('profile.lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Last name must be 1-50 characters'),
  body('profile.timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be valid'),
  body('profile.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
    .withMessage('Language must be a supported language code'),
  handleValidationErrors
];

export const validateChangePassword = [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 6 characters with uppercase, lowercase, and number'),
  handleValidationErrors
];

/**
 * Tenant validation
 */
export const validateTenantSettings = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Organization name must be 2-100 characters'),
  body('settings.allowRegistration')
    .optional()
    .isBoolean()
    .withMessage('Allow registration must be boolean'),
  body('settings.maxUsersPerTenant')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max users must be between 1 and 1000'),
  handleValidationErrors
];

/**
 * Sanitization helpers
 */
export const sanitizeHtml = (req, res, next) => {
  // Basic HTML sanitization for content fields
  if (req.body.content) {
    // Remove script tags and other potentially dangerous HTML
    req.body.content = req.body.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  next();
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (req, res, next) => {
  // Add rate limiting context to request
  req.rateLimitKey = `${req.ip}:${req.auth?.tenantId || 'anonymous'}`;
  next();
};

export default {
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateCreateNote,
  validateUpdateNote,
  validateObjectId,
  validateTenantSlug,
  validateNotesQuery,
  validateUserProfile,
  validateChangePassword,
  validateTenantSettings,
  sanitizeHtml,
  validateRateLimit
};
