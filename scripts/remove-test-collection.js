require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function removeTestCollection() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    if (collections.some(col => col.name === 'test')) {
      await db.dropCollection('test');
      console.log('✅ Test collection removed successfully.');
    } else {
      console.log('ℹ️ No test collection found.');
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error removing test collection:', error);
    process.exit(1);
  }
}

removeTestCollection();
