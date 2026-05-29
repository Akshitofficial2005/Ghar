// Script to drop the Gharwebapp database from MongoDB Atlas
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI.replace('/ghar-production', '/Gharwebapp');

async function dropGharwebappDatabase() {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to Gharwebapp database');

  await mongoose.connection.dropDatabase();
  console.log('Dropped Gharwebapp database');

  await mongoose.disconnect();
  console.log('Disconnected.');
}

dropGharwebappDatabase().catch(err => {
  console.error('Error dropping database:', err);
  process.exit(1);
});
