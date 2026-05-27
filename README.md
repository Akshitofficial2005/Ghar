# Ghar Backend

This is the backend server for the Ghar PG Booking Platform. It supports both in-memory data and MongoDB.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file with:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5001
```

3. Start the server:
```
npm start
```

## MongoDB Support

The server will automatically use MongoDB if `MONGODB_URI` is provided in the environment variables. If MongoDB connection fails, it will fall back to in-memory data.

## Demo Accounts

- Admin: admin@ghar.com / admin123
- Owner: owner@ghar.com / owner123
- User: user@demo.com / demo123