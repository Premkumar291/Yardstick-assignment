import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [1, 'Title is required']
  },
  content: {
    type: String,
    required: true,
    maxlength: [50000, 'Content cannot exceed 50,000 characters']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  metadata: {
    format: {
      type: String,
      enum: ['markdown', 'rich-text', 'plain-text'],
      default: 'markdown'
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    },
    characterCount: {
      type: Number,
      default: 0,
      min: 0
    },
    readingTime: {
      type: Number,
      default: 0,
      min: 0 // in minutes
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'shared', 'public'],
    default: 'private'
  },
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      default: null,
      unique: true,
      sparse: true
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['read', 'comment', 'edit'],
        default: 'read'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    publicUrl: {
      type: String,
      default: null
    },
    allowComments: {
      type: Boolean,
      default: false
    }
  },
  versions: [{
    content: String,
    title: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDescription: String
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewed: {
      type: Date,
      default: null
    },
    viewHistory: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      ipAddress: String,
      userAgent: String
    }]
  },
  reminders: [{
    title: String,
    dueDate: Date,
    isCompleted: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and multi-tenancy
noteSchema.index({ tenantId: 1, userId: 1 });
noteSchema.index({ tenantId: 1, status: 1 });
noteSchema.index({ tenantId: 1, isDeleted: 1 });
noteSchema.index({ tenantId: 1, createdAt: -1 });
noteSchema.index({ tenantId: 1, updatedAt: -1 });
noteSchema.index({ tenantId: 1, tags: 1 });
noteSchema.index({ tenantId: 1, category: 1 });
noteSchema.index({ shareToken: 1 }, { sparse: true });
noteSchema.index({ 'sharing.isShared': 1 });

// Text search index
noteSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text',
  category: 'text'
}, {
  weights: {
    title: 10,
    content: 5,
    tags: 3,
    category: 2
  }
});

// Virtual for excerpt
noteSchema.virtual('excerpt').get(function() {
  if (!this.content) return '';
  
  // Remove markdown formatting for excerpt
  let plainText = this.content
    .replace(/[#*`_~\[\]]/g, '') // Remove markdown characters
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
    
  return plainText.length > 150 
    ? plainText.substring(0, 150) + '...'
    : plainText;
});

// Virtual for checking if note is shared
noteSchema.virtual('isSharedNote').get(function() {
  return this.sharing.isShared || this.visibility === 'shared' || this.visibility === 'public';
});

// Virtual for estimated reading time
noteSchema.virtual('estimatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  return Math.ceil(this.metadata.wordCount / wordsPerMinute);
});

// Pre-save middleware
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate metadata
  if (this.isModified('content')) {
    this.metadata.characterCount = this.content.length;
    this.metadata.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
    this.metadata.readingTime = Math.ceil(this.metadata.wordCount / 200); // 200 WPM average
  }
  
  // Limit tags to 10
  if (this.tags && this.tags.length > 10) {
    this.tags = this.tags.slice(0, 10);
  }
  
  // Generate share token if sharing is enabled and token doesn't exist
  if (this.sharing.isShared && !this.sharing.shareToken) {
    this.sharing.shareToken = this.generateShareToken();
  }
  
  // Limit version history to last 50 versions
  if (this.versions && this.versions.length > 50) {
    this.versions = this.versions.slice(-50);
  }
  
  next();
});

// Pre-remove middleware to handle soft delete
noteSchema.pre('remove', function(next) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  next();
});

// Instance method to create a version snapshot
noteSchema.methods.createVersion = function(changeDescription = 'Auto-save') {
  const version = {
    content: this.content,
    title: this.title,
    createdBy: this.userId,
    changeDescription
  };
  
  this.versions.push(version);
  
  // Keep only last 50 versions
  if (this.versions.length > 50) {
    this.versions = this.versions.slice(-50);
  }
  
  return this.save();
};

// Instance method to soft delete
noteSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to restore from soft delete
noteSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Instance method to generate share token
noteSchema.methods.generateShareToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Instance method to add view
noteSchema.methods.addView = function(userId = null, ipAddress = null, userAgent = null) {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  this.lastAccessedAt = new Date();
  
  if (userId || ipAddress) {
    this.analytics.viewHistory.push({
      userId,
      ipAddress,
      userAgent,
      viewedAt: new Date()
    });
    
    // Keep only last 100 view records
    if (this.analytics.viewHistory.length > 100) {
      this.analytics.viewHistory = this.analytics.viewHistory.slice(-100);
    }
  }
  
  return this.save();
};

// Static method to find notes by tenant
noteSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { 
    tenantId,
    isDeleted: { $ne: true }
  };
  
  if (options.userId) {
    query.userId = options.userId;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  const sort = options.sort || { updatedAt: -1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  
  return this.find(query)
    .populate('userId', 'email profile.firstName profile.lastName')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to search notes
noteSchema.statics.searchByTenant = function(tenantId, searchTerm, options = {}) {
  const query = {
    tenantId,
    isDeleted: { $ne: true },
    $text: { $search: searchTerm }
  };
  
  if (options.userId) {
    query.userId = options.userId;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('userId', 'email profile.firstName profile.lastName')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Static method to get note statistics for tenant
noteSchema.statics.getStatsByTenant = function(tenantId, userId = null) {
  const matchStage = { 
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isDeleted: { $ne: true }
  };
  
  if (userId) {
    matchStage.userId = new mongoose.Types.ObjectId(userId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        totalWords: { $sum: '$metadata.wordCount' },
        totalCharacters: { $sum: '$metadata.characterCount' },
        averageWordsPerNote: { $avg: '$metadata.wordCount' },
        notesByStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        notesByCategory: {
          $push: {
            category: '$category',
            count: 1
          }
        }
      }
    }
  ]);
};

const Note = mongoose.model('Note', noteSchema);

export default Note;
