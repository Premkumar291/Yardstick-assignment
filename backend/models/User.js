import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    maxlength: [255, 'Email cannot exceed 255 characters']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
    required: true
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']
    }
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    defaultNoteFormat: {
      type: String,
      enum: ['markdown', 'rich-text', 'plain-text'],
      default: 'markdown'
    }
  },
  security: {
    lastLogin: {
      type: Date,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0,
      max: 5
    },
    lockUntil: {
      type: Date,
      default: null
    },
    passwordResetToken: {
      type: String,
      default: null
    },
    passwordResetExpires: {
      type: Date,
      default: null
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      default: null
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    }
  },
  permissions: {
    canCreateNotes: {
      type: Boolean,
      default: true
    },
    canEditNotes: {
      type: Boolean,
      default: true
    },
    canDeleteNotes: {
      type: Boolean,
      default: true
    },
    canShareNotes: {
      type: Boolean,
      default: true
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canManageTenant: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security.passwordResetToken;
      delete ret.security.twoFactorSecret;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Compound index for unique email per tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'security.emailVerified': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.email.split('@')[0];
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Virtual for checking if user is admin
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Hash password if it's modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Set admin permissions for admin role
  if (this.isModified('role') && this.role === 'admin') {
    this.permissions.canManageUsers = true;
    this.permissions.canManageTenant = true;
  }
  
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 
      'security.loginAttempts': 1,
      'security.lockUntil': 1 
    },
    $set: { 'security.lastLogin': new Date() }
  });
};

// Static method to find user by email and tenant
userSchema.statics.findByEmailAndTenant = function(email, tenantId) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    tenantId,
    isActive: true 
  }).populate('tenantId', 'slug name plan isActive');
};

// Static method to find users by tenant
userSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId, isActive: true };
  
  if (options.role) {
    query.role = options.role;
  }
  
  return this.find(query)
    .populate('tenantId', 'slug name plan')
    .sort({ createdAt: -1 });
};

// Instance method to check permission
userSchema.methods.hasPermission = function(permission) {
  if (!this.isActive) return false;
  if (this.role === 'admin') return true; // Admins have all permissions
  return this.permissions[permission] === true;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.security.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.security.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return token; // Return unhashed token
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.security.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return token; // Return unhashed token
};

const User = mongoose.model('User', userSchema);

export default User;
