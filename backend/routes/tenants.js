import express from 'express';
import { 
  getCurrentTenant,
  upgradeTenant,
  getTenantUsage,
  updateTenantSettings
} from '../controllers/tenantController.js';
import { 
  validateTenantSlug,
  validateTenantSettings
} from '../middleware/validation.js';
import { authenticated, adminOnly } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/tenants/current
 * @desc    Get current tenant information
 * @access  Private (Member or Admin)
 */
router.get('/current', 
  authenticated, 
  getCurrentTenant
);

/**
 * @route   GET /api/tenants/usage
 * @desc    Get tenant usage statistics
 * @access  Private (Member or Admin)
 */
router.get('/usage', 
  authenticated, 
  getTenantUsage
);

/**
 * @route   PUT /api/tenants/settings
 * @desc    Update tenant settings
 * @access  Private (Admin only)
 */
router.put('/settings', 
  adminOnly, 
  validateTenantSettings, 
  updateTenantSettings
);

/**
 * @route   POST /api/tenants/:slug/upgrade
 * @desc    Upgrade tenant subscription to Pro
 * @access  Private (Admin only)
 */
router.post('/:slug/upgrade', 
  adminOnly, 
  validateTenantSlug, 
  upgradeTenant
);

export default router;
