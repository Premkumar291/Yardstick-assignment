import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Tenant, User } from '../models/index.js';

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-saas', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing test data...');
    await User.deleteMany({ 
      email: { 
        $in: ['admin@acme.test', 'user@acme.test', 'admin@globex.test', 'user@globex.test'] 
      } 
    });
    await Tenant.deleteMany({ 
      slug: { $in: ['acme', 'globex'] } 
    });

    // Create Acme tenant
    console.log('Creating Acme tenant...');
    const acmeTenant = new Tenant({
      slug: 'acme',
      name: 'Acme Corporation',
      plan: 'free',
      noteLimit: 3,
      isActive: true,
      settings: {
        allowRegistration: true,
        maxUsersPerTenant: 100
      }
    });
    await acmeTenant.save();

    // Create Globex tenant
    console.log('Creating Globex tenant...');
    const globexTenant = new Tenant({
      slug: 'globex',
      name: 'Globex Corporation',
      plan: 'pro',
      noteLimit: -1, // Unlimited
      isActive: true,
      settings: {
        allowRegistration: true,
        maxUsersPerTenant: 1000
      },
      subscription: {
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    });
    await globexTenant.save();

    // Create test users
    const testUsers = [
      {
        email: 'admin@acme.test',
        password: 'password',
        tenantId: acmeTenant._id,
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        },
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
        email: 'user@acme.test',
        password: 'password',
        tenantId: acmeTenant._id,
        role: 'member',
        profile: {
          firstName: 'Regular',
          lastName: 'User'
        },
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
        email: 'admin@globex.test',
        password: 'password',
        tenantId: globexTenant._id,
        role: 'admin',
        profile: {
          firstName: 'Globex',
          lastName: 'Admin'
        },
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
        email: 'user@globex.test',
        password: 'password',
        tenantId: globexTenant._id,
        role: 'member',
        profile: {
          firstName: 'Globex',
          lastName: 'Member'
        },
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

    console.log('Creating test users...');
    for (const userData of testUsers) {
      const user = new User({
        ...userData,
        isActive: true
      });
      await user.save();
      console.log(`Created user: ${userData.email} (${userData.role})`);
    }

    // Update tenant user counts
    await acmeTenant.incrementUsage('users', 2);
    await globexTenant.incrementUsage('users', 2);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest Accounts Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏢 Acme Corporation (Free Plan - 3 notes limit)');
    console.log('   👤 admin@acme.test / password (Admin)');
    console.log('   👤 user@acme.test / password (Member)');
    console.log('');
    console.log('🏢 Globex Corporation (Pro Plan - Unlimited notes)');
    console.log('   👤 admin@globex.test / password (Admin)');
    console.log('   👤 user@globex.test / password (Member)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now test the application with these accounts!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
