import express from 'express';
import { 
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotes,
  getNotesStats
} from '../controllers/notesController.js';
import { 
  validateCreateNote,
  validateUpdateNote,
  validateObjectId,
  validateNotesQuery,
  sanitizeHtml
} from '../middleware/validation.js';
import { authenticated, memberOrAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private (Member or Admin)
 */
router.post('/', 
  memberOrAdmin, 
  validateCreateNote, 
  sanitizeHtml, 
  createNote
);

/**
 * @route   GET /api/notes
 * @desc    Get all notes for the tenant
 * @access  Private (Member or Admin)
 */
router.get('/', 
  memberOrAdmin, 
  validateNotesQuery, 
  getNotes
);

/**
 * @route   GET /api/notes/search
 * @desc    Search notes
 * @access  Private (Member or Admin)
 */
router.get('/search', 
  memberOrAdmin, 
  searchNotes
);

/**
 * @route   GET /api/notes/stats
 * @desc    Get notes statistics
 * @access  Private (Member or Admin)
 */
router.get('/stats', 
  memberOrAdmin, 
  getNotesStats
);

/**
 * @route   GET /api/notes/:id
 * @desc    Get a specific note by ID
 * @access  Private (Member or Admin)
 */
router.get('/:id', 
  memberOrAdmin, 
  validateObjectId('id'), 
  getNoteById
);

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note
 * @access  Private (Member or Admin)
 */
router.put('/:id', 
  memberOrAdmin, 
  validateObjectId('id'), 
  validateUpdateNote, 
  sanitizeHtml, 
  updateNote
);

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note (soft delete)
 * @access  Private (Member or Admin)
 */
router.delete('/:id', 
  memberOrAdmin, 
  validateObjectId('id'), 
  deleteNote
);

export default router;
