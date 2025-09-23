import { Tenant, User } from '../models/index.js';

/**
 * Get current tenant information
 * GET /api/tenants/current
 */
export const getCurrentTenant = async (req, res) => {
  try {
    const { tenantId } = req.auth;

    const tenant = await Tenant.findById(tenantId)
      .select('-__v -createdAt -updatedAt');

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    res.json({
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
        },
        isActive: tenant.isActive
      }
    });

  } catch (error) {
    console.error('Get current tenant error:', error);
    res.status(500).json({
      error: 'Tenant service error',
      code: 'TENANT_SERVICE_ERROR'
    });
  }
};

/**
 * Upgrade tenant subscription to Pro
 * POST /api/tenants/:slug/upgrade
 */
export const upgradeTenant = async (req, res) => {
  try {
    const { slug } = req.params;
    const { tenantId, isAdmin } = req.auth;

    // Only admins can upgrade subscriptions
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Only administrators can upgrade subscriptions',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Find tenant by slug and verify it matches the authenticated user's tenant
    const tenant = await Tenant.findOne({ slug, _id: tenantId });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found or access denied',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if already on Pro plan
    if (tenant.plan === 'pro') {
      return res.status(400).json({
        error: 'Tenant is already on Pro plan',
        code: 'ALREADY_PRO'
      });
    }

    // Upgrade to Pro plan
    tenant.plan = 'pro';
    tenant.noteLimit = -1; // Unlimited
    tenant.subscription.status = 'active';
    tenant.subscription.startDate = new Date();
    // In a real implementation, you would set an end date based on billing cycle
    tenant.subscription.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    await tenant.save();

    res.json({
      message: 'Successfully upgraded to Pro plan',
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
        subscription: {
          status: tenant.subscription.status,
          startDate: tenant.subscription.startDate,
          endDate: tenant.subscription.endDate
        }
      }
    });

  } catch (error) {
    console.error('Upgrade tenant error:', error);
    res.status(500).json({
      error: 'Tenant upgrade service error',
      code: 'TENANT_UPGRADE_SERVICE_ERROR'
    });
  }
};

/**
 * Get tenant usage statistics
 * GET /api/tenants/usage
 */
export const getTenantUsage = async (req, res) => {
  try {
    const { tenantId } = req.auth;

    const tenant = await Tenant.findById(tenantId)
      .select('usage noteLimit plan hasUnlimitedNotes remainingNotes canCreateNotes');

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Get detailed usage statistics
    const userCount = await User.countDocuments({ 
      tenantId, 
      isActive: true 
    });

    res.json({
      usage: {
        ...tenant.usage,
        activeUsers: userCount
      },
      limits: {
        noteLimit: tenant.noteLimit,
        hasUnlimitedNotes: tenant.hasUnlimitedNotes,
        remainingNotes: tenant.remainingNotes,
        canCreateNotes: tenant.canCreateNotes
      },
      plan: tenant.plan
    });

  } catch (error) {
    console.error('Get tenant usage error:', error);
    res.status(500).json({
      error: 'Tenant usage service error',
      code: 'TENANT_USAGE_SERVICE_ERROR'
    });
  }
};

/**
 * Update tenant settings (admin only)
 * PUT /api/tenants/settings
 */
export const updateTenantSettings = async (req, res) => {
  try {
    const { tenantId, isAdmin } = req.auth;
    const { name, settings } = req.body;

    // Only admins can update tenant settings
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Only administrators can update tenant settings',
        code: 'ADMIN_REQUIRED'
      });
    }

    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Update allowed fields
    if (name) {
      tenant.name = name;
    }

    if (settings) {
      tenant.settings = { ...tenant.settings, ...settings };
    }

    await tenant.save();

    res.json({
      message: 'Tenant settings updated successfully',
      tenant: {
        id: tenant._id,
        slug: tenant.slug,
        name: tenant.name,
        settings: tenant.settings
      }
    });

  } catch (error) {
    console.error('Update tenant settings error:', error);
    res.status(500).json({
      error: 'Tenant settings update service error',
      code: 'TENANT_SETTINGS_UPDATE_SERVICE_ERROR'
    });
  }
};

export default {
  getCurrentTenant,
  upgradeTenant,
  getTenantUsage,
  updateTenantSettings
};
