// Script to seed amenities into ghar-production database
require('dotenv').config();
const mongoose = require('mongoose');

const amenityList = [
  'WiFi',
  'Meals',
  'AC',
  'Laundry',
  'Parking',
  'Gym',
  'Security',
  'Power Backup',
  'Housekeeping',
  'CCTV',
  '24/7 Water',
  'Lift',
  'Common Area',
  'Refrigerator',
  'TV',
  'Study Table',
  'Wardrobe',
  'Attached Bathroom',
  'RO Water',
  'Fire Safety',
  'Garden',
  'Balcony',
  'Microwave',
  'Induction',
  'Cooking Allowed',
  'Pets Allowed',
  'Smoking Allowed'
];

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});
const Amenity = mongoose.model('Amenity', amenitySchema, 'amenties');

async function seedAmenities() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to MongoDB');

  for (const name of amenityList) {
    await Amenity.updateOne(
      { name },
      { $set: { name } },
      { upsert: true }
    );
    console.log(`Seeded amenity: ${name}`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete. Disconnected.');
}

seedAmenities().catch(err => {
  console.error('Error seeding amenities:', err);
  process.exit(1);
});
