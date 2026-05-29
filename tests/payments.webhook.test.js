const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

// Mock Payment and Booking models to avoid DB dependency
jest.mock('../models/Payment', () => ({
  findOne: jest.fn()
}));
jest.mock('../models/Booking', () => ({
  findByIdAndUpdate: jest.fn()
}));
jest.mock('../models/WebhookEvent', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const paymentsRouter = require('../routes/payments');

describe('Razorpay webhook', () => {
  let app;

  beforeAll(() => {
    app = express();
    // Use the payments router mounted
    app.use('/api/payments', paymentsRouter);
  });

  test('accepts valid webhook signature and returns 200', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret_123';

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            order_id: 'order_test_1',
            id: 'pay_test_1',
            amount: 50000
          }
        }
      }
    };

    const payloadStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(payloadStr).digest('hex');

    // Ensure Payment.findOne returns null to simulate not found
    Payment.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  test('rejects invalid signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'another_secret';

    const payload = { hello: 'world' };
    const payloadStr = JSON.stringify(payload);
    const badSig = 'bad_signature';

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', badSig)
      .send(payloadStr);

    expect(res.status).toBe(400);
  });
});
