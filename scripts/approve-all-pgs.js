// Script to set isApproved: true and isActive: true for all PGs
const mongoose = require('mongoose');
const PG = require('../models/PG');
require('dotenv').config({ path: '../.env' });

async function updatePGs() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await PG.updateMany({}, { $set: { isApproved: true, isActive: true } });
  console.log(`Updated ${result.modifiedCount || result.nModified} PGs.`);
  await mongoose.disconnect();
}

updatePGs().catch(console.error);
