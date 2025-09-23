# Notes SaaS - Multi-Tenant Notes Application

A modern, scalable multi-tenant SaaS application for note-taking and collaboration built with the MERN stack (MongoDB, Express.js, React, Node.js) and designed for Vercel deployment.

## 🏗️ Architecture Overview

This application implements a **Shared Schema with Tenant ID Column** approach for multi-tenancy, providing an optimal balance of cost-effectiveness, scalability, and maintainability.

### Why This Architecture?

- **Cost-Effective**: Single database reduces infrastructure costs
- **Scalable**: MongoDB handles large datasets efficiently with proper indexing
- **Maintainable**: Easier schema updates and migrations across all tenants
- **Performance**: Proper indexing on `tenantId` ensures fast queries
- **Security**: Application-level tenant filtering with strict middleware enforcement

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Complete tenant isolation at the application level
- **Role-Based Access Control**: Admin and member roles with granular permissions
- **Subscription Management**: Free (3 notes) and Pro (unlimited) plans
- **Real-time Note Editing**: Modern, responsive note editor
- **Advanced Search**: Full-text search across notes with filtering
- **Tag Management**: Organize notes with categories and tags
- **User Management**: Invite and manage team members (Admin only)

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse and DDoS
- **Input Validation**: Comprehensive data validation and sanitization
- **Error Handling**: Robust error handling with user-friendly messages
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **API Documentation**: RESTful API with clear endpoint structure

## 📁 Project Structure

```
notes-saas/
├── backend/                 # Node.js/Express API server
│   ├── models/             # Mongoose data models
│   │   ├── Tenant.js       # Tenant/Organization model
│   │   ├── User.js         # User model with tenant association
│   │   ├── Note.js         # Note model with multi-tenant support
│   │   └── index.js        # Model exports
│   ├── controllers/        # Route controllers (to be implemented)
│   ├── routes/            # API route definitions (to be implemented)
│   ├── middleware/        # Custom middleware (to be implemented)
│   ├── config/           # Configuration files (to be implemented)
│   ├── utils/            # Utility functions (to be implemented)
│   ├── scripts/          # Database scripts (to be implemented)
│   ├── package.json      # Backend dependencies
│   ├── index.js          # Main server file
│   └── .env.example      # Environment variables template
├── frontend/              # React application
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   │   ├── Layout.jsx          # Main app layout
│   │   │   ├── ProtectedRoute.jsx  # Route protection
│   │   │   ├── PublicRoute.jsx     # Public route wrapper
│   │   │   └── LoadingSpinner.jsx  # Loading component
│   │   ├── pages/        # Page components
│   │   │   ├── LoginPage.jsx       # Authentication
│   │   │   ├── RegisterPage.jsx    # User registration
│   │   │   ├── DashboardPage.jsx   # Main dashboard
│   │   │   ├── NotesPage.jsx       # Notes listing
│   │   │   ├── NoteEditorPage.jsx  # Note creation/editing
│   │   │   ├── ProfilePage.jsx     # User profile
│   │   │   ├── SettingsPage.jsx    # Tenant settings
│   │   │   └── NotFoundPage.jsx    # 404 page
│   │   ├── contexts/     # React Context providers
│   │   │   ├── AuthContext.jsx     # Authentication state
│   │   │   └── NotesContext.jsx    # Notes state management
│   │   ├── utils/        # Utility functions
│   │   │   └── api.js              # API client with axios
│   │   ├── hooks/        # Custom React hooks (to be implemented)
│   │   ├── App.jsx       # Main app component with routing
│   │   └── main.jsx      # React entry point
│   ├── package.json      # Frontend dependencies
│   └── .env.example      # Frontend environment template
├── vercel.json           # Vercel deployment configuration
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **Morgan** - HTTP request logger
- **Express Rate Limit** - Rate limiting middleware
- **Express Validator** - Input validation
- **Permify** - Authorization and permission management

### Frontend
- **React 18** - UI library with hooks
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications
- **Vite** - Build tool and development server
- **js-cookie** - Cookie management
- **date-fns** - Date utility library

### Development & Deployment
- **Vercel** - Deployment platform
- **ESLint** - Code linting
- **Git** - Version control

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notes-saas
   ```

2. **Set up Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Set up Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Environment Configuration

#### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/notes-saas
JWT_SECRET=your-super-secret-jwt-key
PERMIFY_ENDPOINT=http://localhost:3476
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Notes SaaS
```

## 🧪 Test Accounts

The application comes with pre-configured test accounts for immediate testing:

### Acme Corporation (Free Plan - 3 notes limit)
- **Admin**: admin@acme.test / password
  - Full administrative access
  - Can upgrade subscription
  - Can manage all tenant notes
- **Member**: user@acme.test / password
  - Standard user access
  - Can create/edit own notes
  - Limited to subscription plan

### Globex Corporation (Pro Plan - Unlimited notes)
- **Admin**: admin@globex.test / password
  - Full administrative access
  - Pro plan features
  - Unlimited note creation
- **Member**: user@globex.test / password
  - Standard user access
  - Pro plan benefits
  - Unlimited note creation

**To create test accounts, run:** `npm run seed` in the backend directory

## 🔒 Security Considerations

### Multi-Tenant Data Isolation
- **Application-Level Filtering**: All database queries include `tenantId` filtering
- **Middleware Enforcement**: Strict tenant context validation on every request
- **Index Optimization**: Database indexes on `tenantId` for performance
- **Row-Level Security**: Implemented through application logic and validation

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Configuration**: Proper cross-origin resource sharing setup

### Data Protection
- **Environment Variables**: Sensitive data stored in environment variables
- **Helmet.js**: Security headers and protection middleware
- **MongoDB Injection Prevention**: Mongoose schema validation and sanitization

## 📊 Subscription Plans

### Free Plan
- ✅ Up to 3 notes
- ✅ Basic note editing (Markdown, Rich Text, Plain Text)
- ✅ Up to 5 team members
- ✅ Basic search and filtering
- ✅ Category and tag organization

### Pro Plan
- ✅ Unlimited notes
- ✅ Advanced note editing features
- ✅ Up to 100 team members
- ✅ Advanced search with full-text indexing
- ✅ Note sharing and collaboration
- ✅ Version history and recovery
- ✅ Priority support
- ✅ Custom domain support

## 🚀 Deployment

### Vercel Deployment

The application is configured for seamless Vercel deployment:

1. **Connect Repository**: Link your Git repository to Vercel
2. **Environment Variables**: Set production environment variables in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy both frontend and backend

#### Required Environment Variables for Production:
```env
# Backend
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/notes-saas
JWT_SECRET=production-jwt-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

# Frontend
VITE_API_URL=https://your-app.vercel.app
```

### Manual Deployment Steps

1. **Prepare Environment**
   ```bash
   # Set production environment variables
   # Update CORS origins for production domain
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## 🔄 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication ✅
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/auth/me` - Current user information
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Notes Management ✅
- `GET /api/notes` - List notes (tenant-filtered, paginated)
- `POST /api/notes` - Create new note (with subscription limits)
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note (owner/admin only)
- `DELETE /api/notes/:id` - Soft delete note (owner/admin only)
- `GET /api/notes/search` - Search notes with full-text search
- `GET /api/notes/stats` - Notes statistics for tenant

### Tenant Management ✅
- `GET /api/tenants/current` - Get current tenant info
- `POST /api/tenants/:slug/upgrade` - Upgrade subscription (Admin only)
- `GET /api/tenants/usage` - Get usage statistics
- `PUT /api/tenants/settings` - Update tenant settings (Admin only)

## 🧩 Development Roadmap

### Phase 1: Foundation ✅
- [x] Project structure setup
- [x] Database models with multi-tenant support
- [x] Basic Express server with middleware
- [x] React application with routing
- [x] Authentication context and API utilities
- [x] Vercel deployment configuration

### Phase 2: Authentication & Authorization ✅
- [x] JWT authentication implementation
- [x] User registration and login
- [x] Tenant creation and management
- [x] Role-based access control
- [x] Test account seeding script

### Phase 3: Core Features ✅
- [x] Notes CRUD operations
- [x] Subscription limit enforcement
- [x] Search and filtering
- [x] Tenant isolation middleware
- [x] Comprehensive API endpoints

### Phase 4: Advanced Features
- [ ] Version history
- [ ] Advanced permissions
- [ ] Subscription management
- [ ] Payment integration
- [ ] Analytics and reporting

### Phase 5: Optimization & Scaling
- [ ] Performance optimization
- [ ] Caching implementation
- [ ] Database optimization
- [ ] Monitoring and logging
- [ ] Advanced security features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints and examples

## 🔮 Future Enhancements

- **Real-time Collaboration**: WebSocket integration for live editing
- **Mobile Applications**: React Native apps for iOS and Android
- **Advanced Analytics**: Usage analytics and insights dashboard
- **Integration APIs**: Third-party integrations (Slack, Discord, etc.)
- **AI Features**: AI-powered note suggestions and auto-completion
- **Advanced Security**: Two-factor authentication, SSO integration
- **Performance**: Redis caching, CDN integration
- **Monitoring**: Application performance monitoring and alerting

---

**Built with ❤️ using the MERN stack and modern development practices.**
