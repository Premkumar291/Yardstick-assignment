import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

// Mock authentication for development (when no database is available)
const mockUsers = [
  {
    email: 'admin@acme.test',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: 'acme',
    role: 'admin',
    fullName: 'Admin User',
    isActive: true,
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: 'acme',
    role: 'member',
    fullName: 'Regular User',
    isActive: true,
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: 'globex',
    role: 'admin',
    fullName: 'Globex Admin',
    isActive: true,
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    tenantId: 'globex',
    role: 'member',
    fullName: 'Globex Member',
    isActive: true,
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

const mockTenants = [
  {
    slug: 'acme',
    name: 'Acme Corporation',
    plan: 'free',
    noteLimit: 3,
    isActive: true
  },
  {
    slug: 'globex',
    name: 'Globex Corporation',
    plan: 'pro',
    noteLimit: -1,
    isActive: true
  }
];

const app = express();
const PORT = process.env.PORT || 5000; // Default port for development

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message, code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(windowMs / 1000)
    });
  }
});

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 200 : 1000, // More restrictive in production
  'Too many requests from this IP, please try again later.'
);

// Authentication rate limiting (more restrictive)
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // Only 10 login attempts per 15 minutes
  'Too many authentication attempts, please try again later.'
);

// Notes creation rate limiting
const notesLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  20, // 20 note operations per minute
  'Too many note operations, please slow down.'
);

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/notes', notesLimiter);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL,
          'https://notes-saas-app.vercel.app',
          'https://notes-saas-app-*.vercel.app'
        ].filter(Boolean)
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://localhost:5174', // Alternative Vite port
          'http://127.0.0.1:5174'
        ];

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-auth-token',
    'X-Tenant-Slug',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Set-Cookie'],
  optionsSuccessStatus: 200, // For legacy browser support
  maxAge: 86400, // 24 hours
  preflightContinue: false
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// MongoDB connection optimized for serverless
let cachedConnection = null;

const connectDB = async () => {
  // Return cached connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-saas';
    
    const connectionOptions = {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10, // Smaller pool for serverless
      serverSelectionTimeoutMS: 10000, // Increase timeout for Atlas
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    };

    // Set mongoose-specific options separately (only valid options)
    mongoose.set('bufferCommands', false);

    // Add authentication if provided
    if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
      connectionOptions.auth = {
        username: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASSWORD
      };
    }

    const conn = await mongoose.connect(mongoUri, connectionOptions);
    
    // Cache the connection
    cachedConnection = conn;
    
    console.log(`MongoDB Connected: ${conn.connection.host} (${process.env.NODE_ENV || 'development'})`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedConnection = null;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedConnection = null;
    });

    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Make sure MongoDB is running or use MongoDB Atlas for cloud database');
    console.error('For local MongoDB: brew install mongodb-community (Mac) or download from mongodb.com');
    cachedConnection = null;
    
    // In serverless, don't exit process on connection failure
    if (process.env.NODE_ENV !== 'production') {
      console.log('💡 Quick fix options:');
      console.log('1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
      console.log('2. Use MongoDB Atlas (free): https://cloud.mongodb.com');
      console.log('3. Use Docker: docker run -d -p 27017:27017 mongo:latest');
      process.exit(1);
    }
    throw error;
  }
};

// Connect to database (skip in development if no DB available)
if (process.env.NODE_ENV !== 'development' || process.env.MONGODB_URI) {
  connectDB();
} else {
  console.log('⚠️  Running in development mode without database connection');
  console.log('📝 Note: API endpoints requiring database will return 503 errors');
}

// Middleware to ensure database connection for each request (serverless optimization)
app.use('/api', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development' || process.env.MONGODB_URI) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      error: 'Database service temporarily unavailable',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }
});

// Import routes
import apiRoutes from './routes/index.js';

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Notes SaaS API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      notes: '/api/notes',
      tenants: '/api/tenants'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Default error response
  const error = {
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(err.statusCode || 500).json({ error });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` API endpoint: http://localhost:${PORT}/api`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
