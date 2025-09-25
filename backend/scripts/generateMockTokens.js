import { generateToken, generateRefreshToken } from '../utils/jwt.js';

// Mock users data - same as in authController and middleware
const mockUsers = [
  {
    userId: 'mock-admin-acme',
    email: 'admin@acme.test',
    tenantId: 'mock-tenant-acme',
    tenantSlug: 'acme',
    role: 'admin',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    }
  },
  {
    userId: 'mock-user-acme',
    email: 'user@acme.test',
    tenantId: 'mock-tenant-acme',
    tenantSlug: 'acme',
    role: 'member',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    }
  },
  {
    userId: 'mock-admin-globex',
    email: 'admin@globex.test',
    tenantId: 'mock-tenant-globex',
    tenantSlug: 'globex',
    role: 'admin',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: true,
      canManageTenant: true
    }
  },
  {
    userId: 'mock-user-globex',
    email: 'user@globex.test',
    tenantId: 'mock-tenant-globex',
    tenantSlug: 'globex',
    role: 'member',
    permissions: {
      canCreateNotes: true,
      canEditNotes: true,
      canDeleteNotes: true,
      canShareNotes: true,
      canManageUsers: false,
      canManageTenant: false
    }
  }
];

console.log('🔑 Generating Mock Account Tokens\n');
console.log('='.repeat(80));

mockUsers.forEach(user => {
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  
  console.log(`\n📧 ${user.email} (${user.role})`);
  console.log(`🏢 Tenant: ${user.tenantSlug}`);
  console.log(`🔑 Access Token:`);
  console.log(accessToken);
  console.log(`🔄 Refresh Token:`);
  console.log(refreshToken);
  console.log('-'.repeat(80));
});

console.log('\n✅ All tokens generated successfully!');
console.log('\n💡 Usage Instructions:');
console.log('1. Copy the access token for the desired user');
console.log('2. In your frontend, set it in localStorage or cookies');
console.log('3. Use it in API requests with Authorization: Bearer <token>');
console.log('\n🚀 Happy testing!');
