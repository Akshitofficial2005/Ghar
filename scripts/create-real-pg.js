// Script to create a real PG in ghar-production for connection verification
require('dotenv').config();
const mongoose = require('mongoose');

const pgSchema = new mongoose.Schema({
  name: String,
  description: String,
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  price: Number,
  owner: String,
  amenities: [String],
  images: [String],
  rules: [String],
  totalRooms: Number,
  availableRooms: Number,
  contactNumber: String
});
const PG = mongoose.model('PG', pgSchema, 'pgs');

async function createRealPG() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to ghar-production');

  const pg = await PG.create({
    name: 'Sharma Residency',
    description: 'Premium PG for working professionals in Indore',
    location: {
      address: 'Scheme No. 54, Vijay Nagar',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452010'
    },
    price: 8500,
    owner: 'real-owner',
    amenities: ['WiFi', 'Meals', 'Parking', 'Security', 'Power Backup'],
    images: [],
    rules: ['No smoking', 'No pets'],
    totalRooms: 10,
    availableRooms: 3,
    contactNumber: '9876543210'
  });
  console.log('✅ Real PG created:', pg._id);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

createRealPG().catch(err => {
  console.error('Error creating real PG:', err);
  process.exit(1);
});
