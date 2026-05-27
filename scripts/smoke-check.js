const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const PG = require('../models/PG');
const Booking = require('../models/Booking');
const { MongoMemoryServer } = require('mongodb-memory-server');

const API_BASE_URL = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5001/api';
let MONGODB_URI = process.env.MONGODB_URI;
const LOGIN_EMAIL = process.env.SMOKE_LOGIN_EMAIL || 'user@demo.com';
const LOGIN_PASSWORD = process.env.SMOKE_LOGIN_PASSWORD || 'demo123';

const client = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

const log = (label, value) => {
  console.log(`${label}:`, value);
};

async function cleanupTempData() {
  const tempPgs = await PG.find({ name: /^Smoke Test PG / }).select('_id');
  const tempPgIds = tempPgs.map(pg => pg._id);

  if (!tempPgIds.length) {
    return { pgsDeleted: 0, bookingsDeleted: 0 };
  }

  const bookingsDeleted = await Booking.deleteMany({ pgId: { $in: tempPgIds } });
  const pgsDeleted = await PG.deleteMany({ _id: { $in: tempPgIds } });

  return {
    pgsDeleted: pgsDeleted.deletedCount || 0,
    bookingsDeleted: bookingsDeleted.deletedCount || 0,
  };
}

async function main() {
  const SKIP_DB_CLEANUP = process.env.SKIP_DB_CLEANUP === 'true';

  if (!SKIP_DB_CLEANUP) {
    if (!MONGODB_URI) {
      if (process.env.USE_IN_MEMORY_DB === 'true') {
        console.log('Starting in-memory MongoDB for smoke-check');
        const mongod = await MongoMemoryServer.create();
        MONGODB_URI = mongod.getUri();
        global.__SMOKE_MONGOD = mongod;
      } else {
        throw new Error('MONGODB_URI is required for smoke setup and cleanup');
      }
    }

    await mongoose.connect(MONGODB_URI);
    await cleanupTempData();
  } else {
    console.log('Skipping DB cleanup per SKIP_DB_CLEANUP=true');
  }

  log('API', API_BASE_URL);
  log('Step', '1/4 login');

  const loginResponse = await client.post('/auth/login', {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });

  const token = loginResponse.data.token;
  if (!token) {
    throw new Error('Login did not return a token');
  }

  const authed = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  });

  const meResponse = await authed.get('/auth/me');
  const ownerId = meResponse.data.user?._id || meResponse.data.user?.id;
  if (!ownerId) {
    throw new Error('Unable to resolve logged-in user id');
  }

  // Fetch an available PG from the public listings to use for booking
  const pgsList = await client.get('/pgs').then(r => r.data?.data || []);
  const tempPg = pgsList[0];
  if (!tempPg || !tempPg._id) throw new Error('No PG available to book in public listings');

  log('Step', '2/4 create booking');
  const bookingResponse = await authed.post('/bookings', {
    pgId: tempPg._id,
    roomTypeId: tempPg.roomTypes?.[0]?._id || null,
    checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    guests: 1,
  });

  const booking = bookingResponse.data.booking;
  if (!booking?._id) {
    throw new Error('Booking was not created');
  }

  log('Booking', booking._id);

  log('Step', '4/4 verify payments disabled');
  const paymentResponse = await authed.post('/payments/create-order', {
    bookingId: booking._id,
    amount: booking.totalAmount || bookingResponse.data.totalAmount || 1000,
  }).catch(error => error.response);

  const paymentStatus = paymentResponse?.status;
  const paymentMessage = paymentResponse?.data?.message || paymentResponse?.data?.error || 'No response body';

  if (paymentStatus !== 503) {
    throw new Error(`Expected 503 payment-disabled response, got ${paymentStatus}: ${paymentMessage}`);
  }

  console.log('✅ Smoke check passed');
  console.log(JSON.stringify({
    login: true,
    bookingId: booking._id,
    paymentStatus,
    paymentMessage,
  }, null, 2));
}

main()
  .catch(error => {
    console.error('❌ Smoke check failed:', error.response?.data || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
      if (process.env.SKIP_DB_CLEANUP !== 'true') {
        try {
          await cleanupTempData();
        } catch (cleanupError) {
          console.error('Cleanup warning:', cleanupError.message);
        }
      }
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    if (global.__SMOKE_MONGOD) {
      try {
        await global.__SMOKE_MONGOD.stop();
      } catch (e) {
        // ignore
      }
    }
  });
