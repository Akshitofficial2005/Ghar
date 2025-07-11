const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ghar PG Booking API',
      version: '1.0.0',
      description: 'Complete API documentation for Ghar PG booking platform',
      contact: {
        name: 'Ghar Support',
        email: 'support@gharapp.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001/api',
        description: 'Development server'
      },
      {
        url: 'https://api.gharapp.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['user', 'owner', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PG: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string' }
              }
            },
            images: { type: 'array', items: { type: 'string' } },
            amenities: { type: 'object' },
            roomTypes: { type: 'array' },
            rating: { type: 'number' },
            isApproved: { type: 'boolean' },
            isActive: { type: 'boolean' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            pgId: { type: 'string' },
            roomTypeId: { type: 'string' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'refunded'] }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };