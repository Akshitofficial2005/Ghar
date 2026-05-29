const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Gharwebapp:akshitMayank2003@cluster0.9eetoaf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('MongoDB URI:', MONGODB_URI);
console.log('URI Length:', MONGODB_URI.length);

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    console.log('MongoDB Connection State:', mongoose.connection.readyState);
    console.log('✅ MongoDB connected successfully!');
    
    // Create a simple test model and document
    const Test = mongoose.model('Test', new mongoose.Schema({ name: String, date: Date }));
    const testDoc = await Test.create({ name: 'Connection Test', date: new Date() });
    console.log('Test document created:', testDoc._id);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

testConnection();