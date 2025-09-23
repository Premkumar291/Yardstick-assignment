import express from 'express';
import { 
  login, 
  register, 
  getCurrentUser, 
  logout, 
  refreshToken 
} from '../controllers/authController.js';
import { 
  validateLogin, 
  validateRegister 
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user and tenant
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

export default router;
