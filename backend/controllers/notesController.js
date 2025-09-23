import { Note, Tenant } from '../models/index.js';
import mongoose from 'mongoose';

/**
 * Create a new note
 * POST /api/notes
 */
export const createNote = async (req, res) => {
  try {
    const { title, content, category, tags, status = 'draft', visibility = 'private' } = req.body;
    const { tenantId, userId } = req.auth;

    // Check subscription limits
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Check if tenant can create more notes
    if (!tenant.canCreateNotes) {
      const message = tenant.plan === 'free' 
        ? `Free plan limit reached. You can only create ${tenant.noteLimit} notes. Upgrade to Pro for unlimited notes.`
        : 'Note creation limit reached for your current plan.';
        
      return res.status(403).json({
        error: message,
        code: 'NOTE_LIMIT_REACHED',
        currentCount: tenant.usage.currentNoteCount,
        limit: tenant.noteLimit,
        plan: tenant.plan
      });
    }

    // Create note
    const note = new Note({
      title,
      content,
      category: category || null,
      tags: tags || [],
      status,
      visibility,
      tenantId,
      userId,
      metadata: {
        format: 'markdown' // Default format
      }
    });

    await note.save();

    // Update tenant note count
    await tenant.incrementUsage('notes', 1);

    // Populate user information for response
    await note.populate('userId', 'email profile.firstName profile.lastName');

    res.status(201).json({
      message: 'Note created successfully',
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        excerpt: note.excerpt,
        category: note.category,
        tags: note.tags,
        status: note.status,
        visibility: note.visibility,
        metadata: note.metadata,
        author: {
          id: note.userId._id,
          email: note.userId.email,
          name: note.userId.fullName
        },
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite
      },
      tenant: {
        usage: {
          currentNoteCount: tenant.usage.currentNoteCount + 1,
          remainingNotes: tenant.remainingNotes - 1
        }
      }
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      error: 'Note creation service error',
      code: 'NOTE_CREATE_SERVICE_ERROR'
    });
  }
};

/**
 * Get all notes for the tenant
 * GET /api/notes
 */
export const getNotes = async (req, res) => {
  try {
    const { tenantId, userId, isAdmin } = req.auth;
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      status,
      category,
      tags,
      search,
      userId: filterUserId
    } = req.query;

    // Build query
    const query = { tenantId, isDeleted: { $ne: true } };

    // Filter by user (non-admins can only see their own notes)
    if (!isAdmin) {
      query.userId = userId;
    } else if (filterUserId) {
      query.userId = filterUserId;
    }

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [notes, totalCount] = await Promise.all([
      Note.find(query)
        .populate('userId', 'email profile.firstName profile.lastName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-versions -analytics.viewHistory'),
      Note.countDocuments(query)
    ]);

    // Format response
    const formattedNotes = notes.map(note => ({
      id: note._id,
      title: note.title,
      excerpt: note.excerpt,
      category: note.category,
      tags: note.tags,
      status: note.status,
      visibility: note.visibility,
      metadata: {
        wordCount: note.metadata.wordCount,
        characterCount: note.metadata.characterCount,
        readingTime: note.metadata.readingTime,
        format: note.metadata.format
      },
      author: {
        id: note.userId._id,
        email: note.userId.email,
        name: note.userId.fullName
      },
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      lastAccessedAt: note.lastAccessedAt,
      isPinned: note.isPinned,
      isFavorite: note.isFavorite,
      isShared: note.isSharedNote,
      analytics: {
        views: note.analytics.views,
        lastViewed: note.analytics.lastViewed
      }
    }));

    res.json({
      notes: formattedNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: skip + parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        status,
        category,
        tags,
        search,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Notes retrieval service error',
      code: 'NOTES_GET_SERVICE_ERROR'
    });
  }
};

/**
 * Get a specific note by ID
 * GET /api/notes/:id
 */
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, userId, isAdmin } = req.auth;

    // Find note with tenant isolation
    const query = { 
      _id: id, 
      tenantId, 
      isDeleted: { $ne: true } 
    };

    // Non-admins can only access their own notes
    if (!isAdmin) {
      query.userId = userId;
    }

    const note = await Note.findOne(query)
      .populate('userId', 'email profile.firstName profile.lastName');

    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Add view to analytics
    await note.addView(userId, req.ip, req.get('User-Agent'));

    res.json({
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        excerpt: note.excerpt,
        category: note.category,
        tags: note.tags,
        status: note.status,
        visibility: note.visibility,
        metadata: note.metadata,
        author: {
          id: note.userId._id,
          email: note.userId.email,
          name: note.userId.fullName
        },
        sharing: note.sharing,
        attachments: note.attachments,
        reminders: note.reminders,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        lastAccessedAt: note.lastAccessedAt,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite,
        isShared: note.isSharedNote,
        analytics: {
          views: note.analytics.views,
          lastViewed: note.analytics.lastViewed
        }
      }
    });

  } catch (error) {
    console.error('Get note by ID error:', error);
    res.status(500).json({
      error: 'Note retrieval service error',
      code: 'NOTE_GET_SERVICE_ERROR'
    });
  }
};

/**
 * Update a note
 * PUT /api/notes/:id
 */
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, userId, isAdmin } = req.auth;
    const updateData = req.body;

    // Find note with ownership validation
    const query = { 
      _id: id, 
      tenantId, 
      isDeleted: { $ne: true } 
    };

    // Non-admins can only update their own notes
    if (!isAdmin) {
      query.userId = userId;
    }

    const note = await Note.findOne(query);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or access denied',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Create version snapshot before updating
    if (updateData.content && updateData.content !== note.content) {
      await note.createVersion('Manual edit');
    }

    // Update note
    Object.assign(note, updateData);
    await note.save();

    // Populate user information for response
    await note.populate('userId', 'email profile.firstName profile.lastName');

    res.json({
      message: 'Note updated successfully',
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        excerpt: note.excerpt,
        category: note.category,
        tags: note.tags,
        status: note.status,
        visibility: note.visibility,
        metadata: note.metadata,
        author: {
          id: note.userId._id,
          email: note.userId.email,
          name: note.userId.fullName
        },
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        isPinned: note.isPinned,
        isFavorite: note.isFavorite
      }
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      error: 'Note update service error',
      code: 'NOTE_UPDATE_SERVICE_ERROR'
    });
  }
};

/**
 * Delete a note (soft delete)
 * DELETE /api/notes/:id
 */
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, userId, isAdmin } = req.auth;

    // Find note with ownership validation
    const query = { 
      _id: id, 
      tenantId, 
      isDeleted: { $ne: true } 
    };

    // Non-admins can only delete their own notes
    if (!isAdmin) {
      query.userId = userId;
    }

    const note = await Note.findOne(query);

    if (!note) {
      return res.status(404).json({
        error: 'Note not found or access denied',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Soft delete the note
    await note.softDelete(userId);

    // Update tenant note count
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      await tenant.decrementUsage('notes', 1);
    }

    res.json({
      message: 'Note deleted successfully',
      noteId: note._id
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      error: 'Note deletion service error',
      code: 'NOTE_DELETE_SERVICE_ERROR'
    });
  }
};

/**
 * Search notes
 * GET /api/notes/search
 */
export const searchNotes = async (req, res) => {
  try {
    const { tenantId, userId, isAdmin } = req.auth;
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required',
        code: 'SEARCH_QUERY_REQUIRED'
      });
    }

    // Build search query
    const searchQuery = { 
      tenantId, 
      isDeleted: { $ne: true },
      $text: { $search: query }
    };

    // Non-admins can only search their own notes
    if (!isAdmin) {
      searchQuery.userId = userId;
    }

    const notes = await Note.find(searchQuery, { 
      score: { $meta: 'textScore' } 
    })
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .select('-content -versions -analytics.viewHistory');

    const formattedNotes = notes.map(note => ({
      id: note._id,
      title: note.title,
      excerpt: note.excerpt,
      category: note.category,
      tags: note.tags,
      status: note.status,
      author: {
        id: note.userId._id,
        email: note.userId.email,
        name: note.userId.fullName
      },
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      relevanceScore: note.score
    }));

    res.json({
      query,
      results: formattedNotes,
      count: formattedNotes.length
    });

  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({
      error: 'Notes search service error',
      code: 'NOTES_SEARCH_SERVICE_ERROR'
    });
  }
};

/**
 * Get notes statistics
 * GET /api/notes/stats
 */
export const getNotesStats = async (req, res) => {
  try {
    const { tenantId, userId, isAdmin } = req.auth;

    // Build match query
    const matchQuery = { tenantId, isDeleted: { $ne: true } };
    
    // Non-admins get stats for their notes only
    if (!isAdmin) {
      matchQuery.userId = new mongoose.Types.ObjectId(userId);
    }

    const stats = await Note.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          totalWords: { $sum: '$metadata.wordCount' },
          totalCharacters: { $sum: '$metadata.characterCount' },
          averageWordsPerNote: { $avg: '$metadata.wordCount' },
          notesByStatus: {
            $push: {
              k: '$status',
              v: 1
            }
          },
          notesByCategory: {
            $push: {
              k: { $ifNull: ['$category', 'Uncategorized'] },
              v: 1
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalNotes: 1,
          totalWords: 1,
          totalCharacters: 1,
          averageWordsPerNote: { $round: ['$averageWordsPerNote', 2] },
          notesByStatus: { $arrayToObject: '$notesByStatus' },
          notesByCategory: { $arrayToObject: '$notesByCategory' }
        }
      }
    ]);

    const result = stats[0] || {
      totalNotes: 0,
      totalWords: 0,
      totalCharacters: 0,
      averageWordsPerNote: 0,
      notesByStatus: {},
      notesByCategory: {}
    };

    res.json(result);

  } catch (error) {
    console.error('Get notes stats error:', error);
    res.status(500).json({
      error: 'Notes statistics service error',
      code: 'NOTES_STATS_SERVICE_ERROR'
    });
  }
};

export default {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotes,
  getNotesStats
};
