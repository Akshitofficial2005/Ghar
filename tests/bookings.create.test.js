const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { _id: 'user_1', role: 'user' };
    next();
  }
}));

jest.mock('../models/PG', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Booking', () => {
  const Booking = jest.fn();
  Booking.find = jest.fn();
  Booking.findById = jest.fn();
  return Booking;
});

const PG = require('../models/PG');
const Booking = require('../models/Booking');

const bookingsRouter = require('../routes/bookings');

describe('Bookings create route', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bookings', bookingsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates booking when PG has no roomTypes using monthly price fallback', async () => {
    PG.findById.mockResolvedValue({
      _id: 'pg_1',
      roomTypes: [],
      price: { monthly: 12000 }
    });

    const populate = jest.fn().mockResolvedValue(undefined);
    Booking.mockImplementation((data) => ({
      ...data,
      _id: 'booking_1',
      save: jest.fn().mockResolvedValue(undefined),
      populate
    }));

    const res = await request(app)
      .post('/api/bookings')
      .send({
        pgId: 'pg_1',
        checkIn: '2026-05-01T00:00:00.000Z',
        checkOut: '2026-05-03T00:00:00.000Z',
        guests: 1
      });

    expect(res.status).toBe(201);
    expect(Booking).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        pgId: 'pg_1',
        roomTypeId: null,
        totalAmount: 24000,
        status: 'pending'
      })
    );
    expect(res.body.booking._id).toBe('booking_1');
  });
});
