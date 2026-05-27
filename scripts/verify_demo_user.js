const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in ../.env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const coll = mongoose.connection.collection('users');
  const email = 'user@demo.com';
  const res = await coll.updateOne({ email }, { $set: { isEmailVerified: true } });
  console.log('Update result:', { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount });
  await mongoose.disconnect();
  if (res.modifiedCount > 0) process.exit(0);
  process.exit(res.matchedCount === 0 ? 2 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
