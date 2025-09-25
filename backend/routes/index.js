import express from 'express';
import authRoutes from './auth.js';
import notesRoutes from './notes.js';
import tenantsRoutes from './tenants.js';
import mockAuthRoutes from './mockAuth.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Notes SaaS API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/mock-auth', mockAuthRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

export default router;
