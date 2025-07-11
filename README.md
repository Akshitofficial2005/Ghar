# Ghar Backend API

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env` file and update with your credentials:
- MongoDB connection string
- JWT secret key
- Razorpay keys
- Cloudinary credentials
- Email configuration

### 3. Database Setup
```bash
# Seed initial data
node utils/seedData.js
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/google` - Google OAuth

### PGs
- GET `/api/pgs` - Get all PGs with filters
- GET `/api/pgs/:id` - Get PG by ID
- POST `/api/pgs` - Create PG (Owner only)
- PUT `/api/pgs/:id` - Update PG
- DELETE `/api/pgs/:id` - Delete PG

### Bookings
- POST `/api/bookings` - Create booking
- GET `/api/bookings` - Get user bookings
- GET `/api/bookings/:id` - Get booking by ID
- PUT `/api/bookings/:id/cancel` - Cancel booking

### Payments
- POST `/api/payments/create-order` - Create Razorpay order
- POST `/api/payments/verify` - Verify payment
- POST `/api/payments/webhook` - Razorpay webhook

### File Upload
- POST `/api/upload/image` - Upload single image
- POST `/api/upload/images` - Upload multiple images

## Default Credentials
- Admin: admin@gharapp.com / admin123
- Owner: owner@gharapp.com / owner123