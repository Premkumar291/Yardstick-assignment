import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    minlength: [2, 'Slug must be at least 2 characters long'],
    maxlength: [50, 'Slug cannot exceed 50 characters']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
    required: true
  },
  noteLimit: {
    type: Number,
    default: function() {
      return this.plan === 'free' ? 3 : -1; // -1 means unlimited for pro
    },
    validate: {
      validator: function(value) {
        if (this.plan === 'free') {
          return value > 0 && value <= 10; // Free plan: 1-10 notes
        }
        return value === -1 || value > 0; // Pro plan: unlimited (-1) or positive number
      },
      message: 'Invalid note limit for the selected plan'
    }
  },
  settings: {
    allowRegistration: {
      type: Boolean,
      default: true
    },
    maxUsersPerTenant: {
      type: Number,
      default: function() {
        return this.plan === 'free' ? 5 : 100;
      }
    },
    customDomain: {
      type: String,
      default: null,
      validate: {
        validator: function(value) {
          if (!value) return true; // Allow null/empty
          // Basic domain validation
          return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(value);
        },
        message: 'Invalid domain format'
      }
    }
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    }
  },
  usage: {
    currentNoteCount: {
      type: Number,
      default: 0,
      min: 0
    },
    currentUserCount: {
      type: Number,
      default: 0,
      min: 0
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: 0 // in bytes
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ isActive: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ 'subscription.status': 1 });

// Virtual for checking if tenant has unlimited notes
tenantSchema.virtual('hasUnlimitedNotes').get(function() {
  return this.noteLimit === -1;
});

// Virtual for remaining note slots
tenantSchema.virtual('remainingNotes').get(function() {
  if (this.hasUnlimitedNotes) return -1; // Unlimited
  return Math.max(0, this.noteLimit - this.usage.currentNoteCount);
});

// Virtual for checking if tenant can create more notes
tenantSchema.virtual('canCreateNotes').get(function() {
  if (!this.isActive || this.subscription.status !== 'active') return false;
  return this.hasUnlimitedNotes || this.usage.currentNoteCount < this.noteLimit;
});

// Pre-save middleware to update timestamps
tenantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update noteLimit based on plan if it's being changed
  if (this.isModified('plan')) {
    if (this.plan === 'free' && (this.noteLimit === -1 || this.noteLimit > 10)) {
      this.noteLimit = 3;
    } else if (this.plan === 'pro' && this.noteLimit < 10) {
      this.noteLimit = -1; // Unlimited
    }
  }
  
  next();
});

// Static method to find active tenant by slug
tenantSchema.statics.findActiveBySlug = function(slug) {
  return this.findOne({ 
    slug: slug.toLowerCase(), 
    isActive: true,
    'subscription.status': 'active'
  });
};

// Instance method to check if tenant can add more users
tenantSchema.methods.canAddUser = function() {
  if (!this.isActive || this.subscription.status !== 'active') return false;
  return this.usage.currentUserCount < this.settings.maxUsersPerTenant;
};

// Instance method to increment usage counters
tenantSchema.methods.incrementUsage = function(type, amount = 1) {
  switch(type) {
    case 'notes':
      this.usage.currentNoteCount += amount;
      break;
    case 'users':
      this.usage.currentUserCount += amount;
      break;
    case 'storage':
      this.usage.storageUsed += amount;
      break;
  }
  return this.save();
};

// Instance method to decrement usage counters
tenantSchema.methods.decrementUsage = function(type, amount = 1) {
  switch(type) {
    case 'notes':
      this.usage.currentNoteCount = Math.max(0, this.usage.currentNoteCount - amount);
      break;
    case 'users':
      this.usage.currentUserCount = Math.max(0, this.usage.currentUserCount - amount);
      break;
    case 'storage':
      this.usage.storageUsed = Math.max(0, this.usage.storageUsed - amount);
      break;
  }
  return this.save();
};

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
