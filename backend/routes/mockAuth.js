import express from 'express';
import { getMockUserWithTokens, setAuthCookies } from '../utils/mockAuth.js';

const router = express.Router();

/**
 * @route   POST /api/mock-auth/login/:email
 * @desc    Set authentication cookies for mock users (development only)
 * @access  Public (development only)
 */
router.post('/login/:email', (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { email } = req.params;
  const mockUser = getMockUserWithTokens(email);

  if (!mockUser) {
    return res.status(404).json({
      error: 'Mock user not found',
      code: 'MOCK_USER_NOT_FOUND',
      availableUsers: [
        'admin@acme.test',
        'user@acme.test', 
        'admin@globex.test',
        'user@globex.test'
      ]
    });
  }

  // Set authentication cookies
  setAuthCookies(res, mockUser, mockUser.accessToken, mockUser.refreshToken);

  res.json({
    message: `Mock authentication successful for ${email}`,
    user: {
      id: mockUser.userId,
      email: mockUser.email,
      role: mockUser.role,
      fullName: mockUser.fullName,
      permissions: mockUser.permissions,
      isAdmin: mockUser.role === 'admin'
    },
    tenant: {
      id: mockUser.tenantId,
      slug: mockUser.tenantSlug,
      name: mockUser.tenantSlug === 'acme' ? 'Acme Corporation' : 'Globex Corporation',
      plan: mockUser.tenantSlug === 'acme' ? 'free' : 'pro',
      noteLimit: mockUser.tenantSlug === 'acme' ? 3 : -1
    },
    tokens: {
      accessToken: mockUser.accessToken,
      refreshToken: mockUser.refreshToken,
      expiresIn: '7d'
    }
  });
});

/**
 * @route   GET /api/mock-auth/users
 * @desc    List all available mock users
 * @access  Public (development only)
 */
router.get('/users', (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const mockUsers = [
    {
      email: 'admin@acme.test',
      role: 'admin',
      tenant: 'acme',
      plan: 'free',
      description: 'Acme Corporation Admin (Free Plan - 3 notes limit)'
    },
    {
      email: 'user@acme.test',
      role: 'member',
      tenant: 'acme',
      plan: 'free',
      description: 'Acme Corporation Member (Free Plan - 3 notes limit)'
    },
    {
      email: 'admin@globex.test',
      role: 'admin',
      tenant: 'globex',
      plan: 'pro',
      description: 'Globex Corporation Admin (Pro Plan - Unlimited notes)'
    },
    {
      email: 'user@globex.test',
      role: 'member',
      tenant: 'globex',
      plan: 'pro',
      description: 'Globex Corporation Member (Pro Plan - Unlimited notes)'
    }
  ];

  res.json({
    message: 'Available mock users for testing',
    users: mockUsers,
    usage: {
      loginEndpoint: 'POST /api/mock-auth/login/:email',
      example: 'POST /api/mock-auth/login/admin@acme.test'
    }
  });
});

export default router;
